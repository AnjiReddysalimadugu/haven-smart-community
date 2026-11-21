package com.smartcommunity.billing;
import com.smartcommunity.property.Flat; import jakarta.persistence.*; import java.math.BigDecimal; import java.time.*; import java.util.UUID;
@Entity @Table(name="bills")
public class Bill {
 @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="flat_id") private Flat flat;
 @Column(nullable=false,length=30) private String billType;
 @Column(nullable=false,length=7) private String billingPeriod;
 @Column(nullable=false,precision=12,scale=2) private BigDecimal amount;
 @Column(nullable=false,precision=12,scale=2) private BigDecimal paidAmount=BigDecimal.ZERO;
 @Column(nullable=false) private LocalDate dueDate;
 @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private BillStatus status=BillStatus.PENDING;
 @Column(nullable=false) private Instant createdAt=Instant.now();
 protected Bill(){}
 public Bill(Flat f,String type,String period,BigDecimal amount,LocalDate due){flat=f;billType=type;billingPeriod=period;this.amount=amount;dueDate=due;}
 public UUID getId(){return id;} public Flat getFlat(){return flat;} public String getBillType(){return billType;} public String getBillingPeriod(){return billingPeriod;} public BigDecimal getAmount(){return amount;} public BigDecimal getPaidAmount(){return paidAmount;} public LocalDate getDueDate(){return dueDate;} public BillStatus getStatus(){return status;}
 public void recordPayment(BigDecimal value){
  paidAmount=paidAmount.add(value);
  refreshStatus();
 }
 /** Append-only reversal: reduces paidAmount without deleting payment history rows. */
 public void recordRefund(BigDecimal value){
  if(value==null||value.signum()<=0) throw new IllegalArgumentException("Refund amount must be positive");
  if(value.compareTo(paidAmount)>0) throw new IllegalArgumentException("Refund exceeds paid amount");
  paidAmount=paidAmount.subtract(value);
  refreshStatus();
 }
 private void refreshStatus(){
  if(paidAmount.compareTo(BigDecimal.ZERO)<=0){paidAmount=BigDecimal.ZERO;status=BillStatus.PENDING;}
  else if(paidAmount.compareTo(amount)>=0) status=BillStatus.PAID;
  else status=BillStatus.PARTIALLY_PAID;
 }
}
