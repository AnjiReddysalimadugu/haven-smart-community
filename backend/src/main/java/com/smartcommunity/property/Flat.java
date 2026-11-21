package com.smartcommunity.property;
import jakarta.persistence.*; import java.math.BigDecimal; import java.util.UUID;
@Entity @Table(name="flats", uniqueConstraints=@UniqueConstraint(columnNames={"floor_id","flat_number"}))
public class Flat {
 @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="floor_id") private Floor floor;
 @Column(name="flat_number",nullable=false,length=30) private String flatNumber;
 @Column(name="area_sqft",precision=10,scale=2) private BigDecimal areaSqft;
 @Column(name="bedroom_count") private Integer bedroomCount;
 @Enumerated(EnumType.STRING) @Column(nullable=false,length=24) private FlatStatus status=FlatStatus.AVAILABLE;
 protected Flat(){}
 public Flat(Floor f,String number,BigDecimal area,Integer bedrooms){floor=f;flatNumber=number;areaSqft=area;bedroomCount=bedrooms;}
 public UUID getId(){return id;} public String getFlatNumber(){return flatNumber;} public BigDecimal getAreaSqft(){return areaSqft;} public Integer getBedroomCount(){return bedroomCount;} public FlatStatus getStatus(){return status;} public Floor getFloor(){return floor;}
 public void setStatus(FlatStatus s){status=s;}
 public void update(String flatNumber,BigDecimal areaSqft,Integer bedroomCount){
  this.flatNumber=flatNumber;this.areaSqft=areaSqft;this.bedroomCount=bedroomCount;
 }
}
