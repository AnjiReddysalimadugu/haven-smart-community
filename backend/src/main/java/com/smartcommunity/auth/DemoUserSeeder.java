package com.smartcommunity.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DemoUserSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DemoUserSeeder.class);
    private static final String DEMO_PASSWORD = "Password@123";

    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;

    public DemoUserSeeder(AppUserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seed("admin@haven.local", "Arjun Rao", Role.ADMIN);
        seed("staff@haven.local", "Meera Iyer", Role.STAFF);
        seed("security@haven.local", "Ravi Gate", Role.SECURITY);
        seed("resident@haven.local", "Priya Nair", Role.RESIDENT);
        log.info("Demo users ready. Shared password: {}", DEMO_PASSWORD);
    }

    private void seed(String email, String fullName, Role role) {
        if (users.existsByEmailIgnoreCase(email)) {
            return;
        }
        users.save(new AppUser(email, passwordEncoder.encode(DEMO_PASSWORD), fullName, role));
    }
}
