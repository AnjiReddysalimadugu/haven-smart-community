package com.smartcommunity.billing;
import jakarta.validation.constraints.*; import java.math.BigDecimal; import java.time.LocalDate; import java.util.UUID;
public final class BillingDtos {
 private BillingDtos(){}
 public record CreateBillRequest(@NotNull UUID flatId,@NotBlank String billType,@Pattern(regexp="\\d{4}-(0[1-9]|1[0-2])") String billingPeriod,@NotNull @DecimalMin("0.01") BigDecimal amount,@NotNull LocalDate dueDate){}
 public record PaymentRequest(@NotNull @DecimalMin("0.01") BigDecimal amount,@NotBlank String method,@NotBlank String reference){}
 public record RefundRequest(@NotNull @DecimalMin("0.01") BigDecimal amount,@NotBlank @Size(max=240) String reason,@Size(max=120) String reference){}
 public record BillResponse(UUID id,UUID flatId,String flatNumber,String billType,String billingPeriod,BigDecimal amount,BigDecimal paidAmount,BigDecimal balance,LocalDate dueDate,BillStatus status){}
}
