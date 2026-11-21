package com.smartcommunity.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.demo")
public class DemoProperties {
    /** When false, DemoDataSeeder skips creating demo society/users. */
    private boolean enabled = true;

    /**
     * Required for demo user seeding. Must come from DEMO_PASSWORD env — never commit a real value.
     */
    private String password = "";

    public boolean isEnabled() { return enabled; }

    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getPassword() { return password; }

    public void setPassword(String password) { this.password = password; }
}
