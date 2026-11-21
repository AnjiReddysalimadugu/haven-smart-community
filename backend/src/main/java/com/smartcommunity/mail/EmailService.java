package com.smartcommunity.mail;

import com.smartcommunity.common.BusinessException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.UnsupportedEncodingException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Service
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final DateTimeFormatter EXPIRY_FMT =
            DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a z").withZone(ZoneId.of("Asia/Kolkata"));

    private final JavaMailSender mailSender;
    private final MailProperties mailProperties;

    public EmailService(JavaMailSender mailSender, MailProperties mailProperties) {
        this.mailSender = mailSender;
        this.mailProperties = mailProperties;
    }

    public boolean isEnabled() {
        return mailProperties.isEnabled();
    }

    public void sendLoginOtp(String toEmail, String fullName, String otp, Instant expiresAt) {
        if (!mailProperties.isEnabled()) {
            throw new BusinessException("SMTP mail is not enabled. Set SMTP_ENABLED=true and SMTP_* settings");
        }
        if (!StringUtils.hasText(toEmail)) {
            throw new BusinessException("Recipient email is missing");
        }

        String safeName = StringUtils.hasText(fullName) ? fullName.trim() : "there";
        String subject = "Haven · your sign-in code";
        String expiryText = EXPIRY_FMT.format(expiresAt);
        String spacedOtp = spaceOtp(otp);
        String brand = StringUtils.hasText(mailProperties.getFromName()) ? mailProperties.getFromName().trim() : "Haven";

        String text = """
                Hi %s,

                Your Haven one-time login code is: %s

                This code expires at %s.
                If you did not request this, you can ignore this email.

                — %s
                """.formatted(safeName, otp, expiryText, brand);

        // Table-based HTML for Gmail/Outlook — Haven ink + emerald (no purple glow).
        String html = """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
                <title>Haven sign-in</title></head>
                <body style="margin:0;padding:0;background:#F7F8FA;-webkit-font-smoothing:antialiased;">
                  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background:#F7F8FA;padding:32px 12px;">
                    <tr><td align="center">
                      <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid rgba(16,24,40,0.08);box-shadow:0 12px 40px rgba(16,24,40,0.08);">
                        <tr>
                          <td style="background:#101828;padding:28px 32px 24px;">
                            <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="vertical-align:middle;">
                                  <div style="display:inline-block;width:36px;height:36px;border-radius:12px;background:#176B55;text-align:center;line-height:36px;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;color:#F8FAFC;">H</div>
                                  <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:0.04em;color:#F8FAFC;margin-left:12px;vertical-align:middle;">HAVEN</span>
                                </td>
                                <td align="right" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(248,250,252,0.55);">Sign-in</td>
                              </tr>
                            </table>
                            <p style="margin:22px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;color:#F8FAFC;font-weight:600;">Your login code</p>
                            <p style="margin:8px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:rgba(248,250,252,0.68);">One-time access for your community OS</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:32px 32px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#101828;">
                            <p style="margin:0 0 6px;font-size:15px;line-height:1.5;">Hi <strong>%s</strong>,</p>
                            <p style="margin:0 0 28px;font-size:15px;line-height:1.55;color:#667085;">Enter this code to finish signing in. It works once and then expires.</p>
                            <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background:#F7F8FA;border-radius:16px;border:1px solid rgba(16,24,40,0.08);">
                              <tr>
                                <td align="center" style="padding:28px 20px;">
                                  <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#98A2B3;font-weight:600;">One-time code</p>
                                  <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:36px;line-height:1.2;letter-spacing:0.28em;font-weight:700;color:#101828;">%s</p>
                                </td>
                              </tr>
                            </table>
                            <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
                              <tr>
                                <td style="padding:14px 16px;background:#E7F5F0;border-radius:12px;border-left:3px solid #176B55;">
                                  <p style="margin:0;font-size:13px;line-height:1.5;color:#0E4F3E;">
                                    Expires <strong>%s</strong>
                                  </p>
                                </td>
                              </tr>
                            </table>
                            <p style="margin:24px 0 0;font-size:13px;line-height:1.55;color:#98A2B3;">Didn’t request this? You can safely ignore the email — your account stays secure.</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:28px 32px 32px;">
                            <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid rgba(16,24,40,0.08);">
                              <tr>
                                <td style="padding-top:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#98A2B3;">
                                  Sent by <span style="color:#176B55;font-weight:600;">%s</span> · Smart community platform<br>
                                  Never share this code with anyone.
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:20px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#98A2B3;">© Haven · secure sign-in</p>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(escape(safeName), escape(spacedOtp), escape(expiryText), escape(brand));

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(text, html);
            helper.setFrom(new InternetAddress(mailProperties.getFrom(), mailProperties.getFromName(), StandardCharsets.UTF_8.name()));
            mailSender.send(message);
            log.info("Login OTP email sent to {}", toEmail);
        } catch (MessagingException | UnsupportedEncodingException | MailException ex) {
            log.error("Failed to send login OTP email to {}: {}", toEmail, ex.getMessage());
            throw new BusinessException("Could not send OTP email. Check SMTP settings and try again");
        }
    }

    private static String spaceOtp(String otp) {
        if (otp == null || otp.isBlank()) return "";
        String digits = otp.trim().replaceAll("\\s+", "");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < digits.length(); i++) {
            if (i > 0) sb.append(' ');
            sb.append(digits.charAt(i));
        }
        return sb.toString();
    }

    public void sendVisitorPass(
            String toEmail,
            String fullName,
            String visitorName,
            String flatNumber,
            String visitType,
            Instant expiresAt,
            String qrToken
    ) {
        if (!mailProperties.isEnabled()) return;
        String safeName = StringUtils.hasText(fullName) ? fullName.trim() : "there";
        String expiryText = EXPIRY_FMT.format(expiresAt);
        String subject = "Visitor pass · " + visitorName;
        String text = """
                Hi %s,

                Visitor pass for %s (%s) at flat %s.
                Expires: %s
                Gate token: %s

                — Haven Community OS
                """.formatted(safeName, visitorName, visitType, flatNumber, expiryText, qrToken);
        sendSimple(toEmail, subject, text);
    }

    public void sendBillCreated(
            String toEmail,
            String fullName,
            String flatNumber,
            String billType,
            String billingPeriod,
            BigDecimal amount,
            LocalDate dueDate
    ) {
        if (!mailProperties.isEnabled()) return;
        String safeName = StringUtils.hasText(fullName) ? fullName.trim() : "there";
        String subject = "New Haven bill · " + billType;
        String text = """
                Hi %s,

                A new %s bill for flat %s (%s) is ready.
                Amount: ₹%s
                Due: %s

                — Haven Community OS
                """.formatted(safeName, billType, flatNumber, billingPeriod, amount, dueDate);
        sendSimple(toEmail, subject, text);
    }

    public void sendPaymentReceipt(
            String toEmail,
            String fullName,
            String flatNumber,
            String billType,
            String billingPeriod,
            BigDecimal amount,
            String method,
            String receiptNumber
    ) {
        if (!mailProperties.isEnabled()) return;
        String safeName = StringUtils.hasText(fullName) ? fullName.trim() : "there";
        String subject = "Haven payment receipt · " + receiptNumber;
        String text = """
                Hi %s,

                Payment received for flat %s · %s (%s).
                Amount: ₹%s
                Method: %s
                Receipt: %s

                — Haven Community OS
                """.formatted(safeName, flatNumber, billType, billingPeriod, amount, method, receiptNumber);
        sendSimple(toEmail, subject, text);
    }

    private void sendSimple(String toEmail, String subject, String text) {
        if (!StringUtils.hasText(toEmail)) return;
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(text);
            helper.setFrom(new InternetAddress(mailProperties.getFrom(), mailProperties.getFromName(), StandardCharsets.UTF_8.name()));
            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException | MailException ex) {
            log.warn("Email '{}' to {} skipped: {}", subject, toEmail, ex.getMessage());
            throw new BusinessException("Could not send email: " + ex.getMessage());
        }
    }

    private static String escape(String value) {
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
