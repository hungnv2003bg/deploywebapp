package com.foxconn.sopchecklist.dto;

import com.foxconn.sopchecklist.entity.FirewallSysLog;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO cho keyset pagination của firewall syslogs
 */
@Data
public class FirewallSysLogKeysetResponse {
    private List<FirewallSysLog> items;
    private LocalDateTime lastCreated;
    private Long lastId;
    private boolean hasNext;
}
