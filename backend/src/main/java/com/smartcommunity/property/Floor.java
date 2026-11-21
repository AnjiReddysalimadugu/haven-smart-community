package com.smartcommunity.property;
import jakarta.persistence.*; import java.util.UUID;
@Entity @Table(name="floors", uniqueConstraints=@UniqueConstraint(columnNames={"block_id","floor_number"}))
public class Floor {
 @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="block_id") private Block block;
 @Column(name="floor_number",nullable=false) private Integer floorNumber;
 @Column(nullable=false,length=80) private String name;
 protected Floor(){}
 public Floor(Block b,Integer n,String name){this.block=b;this.floorNumber=n;this.name=name;}
 public UUID getId(){return id;} public Integer getFloorNumber(){return floorNumber;} public String getName(){return name;} public Block getBlock(){return block;}
 public void update(Integer floorNumber,String name){this.floorNumber=floorNumber;this.name=name;}
}
