package com.smartcommunity.family;

import com.smartcommunity.property.Flat;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "family_members")
public class FamilyMember {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "flat_id")
    private Flat flat;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(nullable = false, length = 40)
    private String relation;

    @Column(length = 20)
    private String mobile;

    @Column
    private Integer age;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected FamilyMember() {
    }

    public FamilyMember(Flat flat, String fullName, String relation, String mobile, Integer age) {
        this.flat = flat;
        this.fullName = fullName;
        this.relation = relation;
        this.mobile = mobile;
        this.age = age;
    }

    public UUID getId() { return id; }
    public Flat getFlat() { return flat; }
    public String getFullName() { return fullName; }
    public String getRelation() { return relation; }
    public String getMobile() { return mobile; }
    public Integer getAge() { return age; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }

    public void update(String fullName, String relation, String mobile, Integer age) {
        this.fullName = fullName;
        this.relation = relation;
        this.mobile = mobile;
        this.age = age;
    }

    public void deactivate() {
        this.active = false;
    }
}
