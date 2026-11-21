package com.smartcommunity.notify;

import com.smartcommunity.auth.UserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/devices")
public class DeviceController {
    private final PushNotificationService push;

    @Value("${app.push.vapid-public-key:}")
    private String vapidPublicKey;

    public DeviceController(PushNotificationService push) {
        this.push = push;
    }

    @PostMapping("/push-token")
    public MapOk register(@Valid @RequestBody RegisterPushRequest body,
                          @AuthenticationPrincipal UserPrincipal principal) {
        push.register(principal.getId(), body.token(), body.platform());
        return new MapOk("registered");
    }

    @DeleteMapping("/push-token")
    public MapOk unregister(@RequestParam String token) {
        push.unregister(token);
        return new MapOk("removed");
    }

    @GetMapping("/vapid-public-key")
    public VapidKeyResponse vapidPublicKey() {
        String key = vapidPublicKey == null || vapidPublicKey.isBlank() ? null : vapidPublicKey.trim();
        return new VapidKeyResponse(key);
    }

    public record RegisterPushRequest(@NotBlank String token, String platform) {}
    public record MapOk(String status) {}
    public record VapidKeyResponse(String publicKey) {}
}
