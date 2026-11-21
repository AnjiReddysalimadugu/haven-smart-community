package com.smartcommunity.auth;

import com.smartcommunity.common.BusinessException;
import com.smartcommunity.common.UnauthorizedException;
import com.smartcommunity.mail.EmailService;
import com.smartcommunity.property.ApartmentRepository;
import com.smartcommunity.property.FlatRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static com.smartcommunity.auth.AuthDtos.*;

@Service
public class AuthService {
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final JwtService jwtService;
    private final AppUserRepository users;
    private final ApartmentRepository apartments;
    private final FlatRepository flats;
    private final LoginOtpRepository otps;
    private final PasswordEncoder passwordEncoder;
    private final OtpProperties otpProperties;
    private final EmailService emailService;
    private final GoogleAuthProperties googleAuthProperties;
    private final GoogleIdTokenService googleIdTokenService;

    public AuthService(JwtService jwtService, AppUserRepository users, ApartmentRepository apartments,
                       FlatRepository flats, LoginOtpRepository otps, PasswordEncoder passwordEncoder,
                       OtpProperties otpProperties, EmailService emailService,
                       GoogleAuthProperties googleAuthProperties, GoogleIdTokenService googleIdTokenService) {
        this.jwtService = jwtService;
        this.users = users;
        this.apartments = apartments;
        this.flats = flats;
        this.otps = otps;
        this.passwordEncoder = passwordEncoder;
        this.otpProperties = otpProperties;
        this.emailService = emailService;
        this.googleAuthProperties = googleAuthProperties;
        this.googleIdTokenService = googleIdTokenService;
    }

    public AuthOptionsResponse authOptions() {
        return new AuthOptionsResponse(googleAuthProperties.isConfigured(), true);
    }

    @Transactional
    public RequestOtpResponse requestOtp(RequestOtpRequest request) {
        String email = normalizeEmail(request.email());
        Instant now = Instant.now();
        Instant expiresAt = now.plus(otpProperties.getTtlMinutes(), ChronoUnit.MINUTES);

        // Rate-limit every email before revealing whether the account exists.
        Instant windowStart = now.minus(otpProperties.getRequestWindowMinutes(), ChronoUnit.MINUTES);
        long recent = otps.countByEmailAndCreatedAtAfter(email, windowStart);
        if (recent >= otpProperties.getMaxRequestsPerWindow()) {
            throw new BusinessException("Too many OTP requests. Please try again later");
        }

        // OTP is only for Haven users that admins created — never email arbitrary addresses.
        AppUser user = users.findByEmailIgnoreCase(email).orElse(null);
        if (user == null || !user.isActive()) {
            LoginOtp decoy = new LoginOtp(email, passwordEncoder.encode(generateOtp()), expiresAt);
            decoy.consume(now);
            otps.save(decoy);
            log.info("OTP refused for unknown/inactive email={}", email);
            throw new BusinessException("No Haven account for this email. Ask your society admin to create your user first");
        }

        otps.consumeAllOpen(email, now);

        String code = generateOtp();
        LoginOtp otp = new LoginOtp(email, passwordEncoder.encode(code), expiresAt);
        otps.saveAndFlush(otp);

        deliverOtp(user, code, expiresAt);

        String message = emailService.isEnabled()
                ? "OTP sent to your registered email. Enter the code to sign in"
                : "OTP generated (dev mode). Check the response or server logs";

        return new RequestOtpResponse(
                message,
                expiresAt,
                otpProperties.isExposeInResponse() ? code : null
        );
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        String code = request.otp() == null ? "" : request.otp().trim();
        Instant now = Instant.now();

        if (!code.matches("\\d{6}")) {
            throw new UnauthorizedException("Invalid email or OTP");
        }

        AppUser user = users.findByEmailIgnoreCase(email).orElse(null);
        if (user == null || !user.isActive()) {
            throw new UnauthorizedException("Invalid email or OTP");
        }

        LoginOtp otp = otps.findLatestActive(email, now)
                .orElseThrow(() -> new UnauthorizedException("Invalid or expired OTP"));

        if (otp.isExpired(now)) {
            otp.consume(now);
            otps.save(otp);
            throw new UnauthorizedException("OTP expired. Request a new code");
        }

        if (otp.getAttemptCount() >= otpProperties.getMaxVerifyAttempts()) {
            otp.consume(now);
            otps.save(otp);
            throw new UnauthorizedException("OTP attempts exceeded. Request a new code");
        }

        if (!passwordEncoder.matches(code, otp.getOtpHash())) {
            otp.incrementAttempts();
            if (otp.getAttemptCount() >= otpProperties.getMaxVerifyAttempts()) {
                otp.consume(now);
            }
            otps.save(otp);
            throw new UnauthorizedException("Invalid email or OTP");
        }

        otp.consume(now);
        otps.save(otp);

        String token = jwtService.createToken(user);
        return new LoginResponse(token, "Bearer", jwtService.expiresInSeconds(), toResponse(user));
    }

    /**
     * Sign in with a Google ID token. Same rule as OTP: account must already exist and be active.
     * Does not auto-provision users (apartment isolation / ACL preserved).
     */
    @Transactional
    public LoginResponse loginWithGoogle(GoogleLoginRequest request) {
        GoogleIdTokenService.VerifiedGoogleUser google = googleIdTokenService.verify(request.idToken());

        AppUser user = users.findByEmailIgnoreCase(google.email()).orElse(null);
        if (user == null) {
            throw new BusinessException(
                    "No Haven account for " + google.email()
                            + ". Ask your society admin to create your user first");
        }
        if (!user.isActive()) {
            throw new UnauthorizedException("This Haven account is inactive. Contact your society admin");
        }

        // Prefer a real Google display name when the stored name is blank / email-like
        if (google.fullName() != null && !google.fullName().isBlank()) {
            String current = user.getFullName() == null ? "" : user.getFullName().trim();
            if (current.isBlank() || current.equalsIgnoreCase(user.getEmail())) {
                user.setFullName(google.fullName().trim());
                users.save(user);
            }
        }

        log.info("Google sign-in ok email={} sub={}", google.email(), google.subject());
        String token = jwtService.createToken(user);
        return new LoginResponse(token, "Bearer", jwtService.expiresInSeconds(), toResponse(user));
    }

    @Transactional(readOnly = true)
    public AuthUserResponse me(UserPrincipal principal) {
        if (principal == null) {
            throw new UnauthorizedException("Authentication is required");
        }
        AppUser user = users.findById(principal.getId())
                .orElseThrow(() -> new UnauthorizedException("User account is unavailable"));
        return toResponse(user);
    }

    @Transactional
    public AuthUserResponse updateProfile(UpdateProfileRequest request, UserPrincipal principal) {
        if (principal == null) {
            throw new UnauthorizedException("Authentication is required");
        }
        AppUser user = users.findById(principal.getId())
                .orElseThrow(() -> new UnauthorizedException("User account is unavailable"));
        user.setFullName(request.fullName().trim());
        if (request.password() != null && !request.password().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.password().trim()));
        }
        return toResponse(users.save(user));
    }

    private void deliverOtp(AppUser user, String code, Instant expiresAt) {
        if (emailService.isEnabled()) {
            emailService.sendLoginOtp(user.getEmail(), user.getFullName(), code, expiresAt);
            log.info("Login OTP emailed to {} expiresAt={}", user.getEmail(), expiresAt);
            return;
        }

        if (otpProperties.isExposeInResponse()) {
            log.warn("SMTP disabled — OTP exposed in API response for email={} (dev only)", user.getEmail());
            return;
        }

        throw new BusinessException(
                "SMTP is not configured. Set SMTP_ENABLED=true with SMTP_HOST/USERNAME/PASSWORD, "
                        + "or set OTP_EXPOSE=true only for local testing");
    }

    private AuthUserResponse toResponse(AppUser user) {
        String apartmentName = user.getApartmentId() == null ? null
                : apartments.findById(user.getApartmentId()).map(a -> a.getName()).orElse(null);
        String flatNumber = user.getFlatId() == null ? null
                : flats.findById(user.getFlatId()).map(f -> f.getFlatNumber()).orElse(null);
        return new AuthUserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getApartmentId(),
                apartmentName,
                user.getFlatId(),
                flatNumber
        );
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    private static String generateOtp() {
        int value = RANDOM.nextInt(1_000_000);
        return String.format("%06d", value);
    }
}
