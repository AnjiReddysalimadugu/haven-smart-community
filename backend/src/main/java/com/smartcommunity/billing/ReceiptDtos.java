package com.smartcommunity.billing;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public final class ReceiptDtos {
    private ReceiptDtos() {
    }

    public record ReceiptResponse(
            UUID id,
            String receiptNumber,
            UUID billId,
            UUID flatId,
            String flatNumber,
            String billType,
            String billingPeriod,
            BigDecimal amount,
            String method,
            String reference,
            Instant paidAt,
            BillStatus billStatus
    ) {
    }
}
