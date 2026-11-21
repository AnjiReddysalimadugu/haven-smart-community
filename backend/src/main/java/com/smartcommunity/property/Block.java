package com.smartcommunity.property;
import jakarta.persistence.*; import java.util.UUID;
@Entity @Table(name="blocks", uniqueConstraints=@UniqueConstraint(columnNames={"apartment_id","code"}))
public class Block {
 @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="apartment_id") private Apartment apartment;
 @Column(nullable=false,length=80) private String name;
 @Column(nullable=false,length=20) private String code;
 protected Block(){}
 public Block(Apartment a,String name,String code){this.apartment=a;this.name=name;this.code=code;}
 public UUID getId(){return id;} public String getName(){return name;} public String getCode(){return code;} public Apartment getApartment(){return apartment;}
 public void update(String name,String code){this.name=name;this.code=code;}
}
