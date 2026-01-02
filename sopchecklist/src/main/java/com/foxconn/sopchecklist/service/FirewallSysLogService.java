package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.dto.FirewallSysLogKeysetResponse;
import com.foxconn.sopchecklist.entity.FirewallSysLog;
import com.foxconn.sopchecklist.repository.FirewallSysLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * Service cho FirewallSysLog
 * Xử lý business logic cho firewall syslog queries
 */
@Service
public class FirewallSysLogService {

    private final FirewallSysLogRepository repository;
    private static final Logger log = LoggerFactory.getLogger(FirewallSysLogService.class);

    public FirewallSysLogService(FirewallSysLogRepository repository) {
        this.repository = repository;
    }

    /**
     * Get firewall logs với pagination
     */
    public Page<FirewallSysLog> getAllLogs(
            String severity,
            String hostname,
            String logText,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            int page,
            int size
    ) {
        LocalDateTime effectiveFromLocal = fromDate;
        LocalDateTime effectiveToLocalExclusive = (toDate != null && toDate.toLocalTime().equals(LocalTime.MIDNIGHT)) ? toDate.plusDays(1) : toDate;
        int effectiveSize = Math.min(Math.max(size, 1), 200);
        Pageable pageable = PageRequest.of(page, effectiveSize);
        String normalizedSeverity = StringUtils.hasText(severity) ? severity : null;
        String hostnamePattern = StringUtils.hasText(hostname) ? "%" + hostname + "%" : null;
        String logTextPattern = StringUtils.hasText(logText) ? "%" + logText + "%" : null;

        log.info("Firewall syslog list [pageable] severity={}, hostname={}, from={}, toEx={}, page={}, size={}",
                normalizedSeverity, hostname, effectiveFromLocal, effectiveToLocalExclusive, page, effectiveSize);

        return repository.findAllWithFilters(
                normalizedSeverity,
                hostnamePattern,
                logTextPattern,
                effectiveFromLocal,
                effectiveToLocalExclusive,
                pageable
        );
    }

    /**
     * Get firewall logs với keyset pagination (hiệu năng cao hơn cho large datasets)
     */
    public FirewallSysLogKeysetResponse getLogsKeyset(
            String severity,
            String hostname,
            String logText,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            LocalDateTime lastCreated,
            Long lastId,
            int size
    ) {
        LocalDateTime effectiveFromLocal = fromDate;
        LocalDateTime effectiveToLocalExclusive = (toDate != null && toDate.toLocalTime().equals(LocalTime.MIDNIGHT)) ? toDate.plusDays(1) : toDate;
        int effectiveSize = Math.min(Math.max(size, 1), 200);
        String normalizedSeverity = StringUtils.hasText(severity) ? severity : null;
        String hostnamePrefix = StringUtils.hasText(hostname) ? hostname + "%" : null;
        String logTextPattern = StringUtils.hasText(logText) ? "%" + logText + "%" : null;

        log.info("Firewall syslog list [keyset] severity={}, hostnamePrefix={}, from={}, toEx={}, lastCreated={}, lastId={}, size={}",
                normalizedSeverity, hostnamePrefix, effectiveFromLocal, effectiveToLocalExclusive, lastCreated, lastId, effectiveSize);

        List<FirewallSysLog> items = repository.findKeyset(
                normalizedSeverity,
                hostnamePrefix,
                logTextPattern,
                effectiveFromLocal,
                effectiveToLocalExclusive,
                lastCreated,
                lastId,
                effectiveSize
        );

        FirewallSysLogKeysetResponse resp = new FirewallSysLogKeysetResponse();
        resp.setItems(items);
        if (!items.isEmpty()) {
            FirewallSysLog last = items.get(items.size() - 1);
            resp.setLastCreated(last.getCreatedDate());
            resp.setLastId(last.getId());
            resp.setHasNext(items.size() == effectiveSize);
        } else {
            resp.setHasNext(false);
            resp.setLastCreated(lastCreated);
            resp.setLastId(lastId);
        }
        return resp;
    }
}
