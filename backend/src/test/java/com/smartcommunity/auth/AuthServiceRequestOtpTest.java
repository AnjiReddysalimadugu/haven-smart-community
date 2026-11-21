package com.smartcommunity.auth;

import com.smartcommunity.common.BusinessException;
import com.smartcommunity.mail.EmailService;
import com.smartcommunity.property.ApartmentRepository;
import com.smartcommunity.property.FlatRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceRequestOtpTest {
    @Mock JwtService jwtService;
    @Mock AppUserRepository users;
    @Mock ApartmentRepository apartments;
    @Mock FlatRepository flats;
    @Mock LoginOtpRepository otps;
    @Mock PasswordEncoder passwordEncoder;
    @Mock EmailService emailService;

    OtpProperties otpProperties = new OtpProperties();
    AuthService service;

    @BeforeEach
    void setUp() {
        otpProperties.setTtlMinutes(10);
        otpProperties.setMaxRequestsPerWindow(3);
        otpProperties.setRequestWindowMinutes(15);
        otpProperties.setMaxVerifyAttempts(5);
        otpProperties.setExposeInResponse(true);
        service = new AuthService(jwtService, users, apartments, flats, otps, passwordEncoder, otpProperties, emailService);
        lenient().when(passwordEncoder.encode(anyString())).thenReturn("hash");
    }

    @Test
    void unknownEmailDoesNotSendOtp() {
        when(otps.countByEmailAndCreatedAtAfter(eq("ghost@haven.local"), any())).thenReturn(0L);
        when(users.findByEmailIgnoreCase("ghost@haven.local")).thenReturn(Optional.empty());
        when(otps.save(any())).thenAnswer(inv -> inv.getArgument(0));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.requestOtp(new AuthDtos.RequestOtpRequest("ghost@haven.local")));
        assertTrue(ex.getMessage().toLowerCase().contains("no haven account"));
        verify(emailService, never()).sendLoginOtp(anyString(), anyString(), anyString(), any());
        verify(emailService, never()).isEnabled();
    }

    @Test
    void rateLimitThrowsBeforeUserLookup() {
        when(otps.countByEmailAndCreatedAtAfter(eq("ghost@haven.local"), any())).thenReturn(3L);
        assertThrows(BusinessException.class,
                () -> service.requestOtp(new AuthDtos.RequestOtpRequest("ghost@haven.local")));
        verify(users, never()).findByEmailIgnoreCase(anyString());
    }

    @Test
    void activeUserGetsOtpDelivered() {
        AppUser user = new AppUser("admin@haven.local", "hash", "Admin", Role.APARTMENT_ADMIN);
        user.setActive(true);
        when(otps.countByEmailAndCreatedAtAfter(eq("admin@haven.local"), any())).thenReturn(0L);
        when(users.findByEmailIgnoreCase("admin@haven.local")).thenReturn(Optional.of(user));
        when(otps.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(emailService.isEnabled()).thenReturn(false);

        var res = service.requestOtp(new AuthDtos.RequestOtpRequest("admin@haven.local"));
        assertNotNull(res.devOtp());
        assertEquals(6, res.devOtp().length());
        verify(emailService, never()).sendLoginOtp(anyString(), anyString(), anyString(), any());
    }
}
