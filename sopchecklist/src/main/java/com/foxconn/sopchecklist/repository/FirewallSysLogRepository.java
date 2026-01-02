package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.FirewallSysLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository cho FirewallSysLog
 * Hỗ trợ pagination và keyset pagination
 */
@Repository
public interface FirewallSysLogRepository extends JpaRepository<FirewallSysLog, Long> {

    @Query(value = """
            SELECT id, facility, severity, hostname, log_text, is_sync, created_date, date_report
            FROM firewall_syslogs
            WHERE (:severity IS NULL OR severity = :severity)
              AND ((:hostnamePattern IS NULL AND :logTextPattern IS NULL)
                   OR (:hostnamePattern IS NOT NULL AND hostname LIKE :hostnamePattern)
                   OR (:logTextPattern IS NOT NULL AND log_text LIKE :logTextPattern))
              AND (:fromDate IS NULL OR created_date >= :fromDate)
              AND (:toDate IS NULL OR created_date < :toDate)
            ORDER BY created_date DESC, id DESC
            """, nativeQuery = true,
            countQuery = """
            SELECT COUNT(*) FROM firewall_syslogs 
            WHERE (:severity IS NULL OR severity = :severity)
              AND ((:hostnamePattern IS NULL AND :logTextPattern IS NULL)
                   OR (:hostnamePattern IS NOT NULL AND hostname LIKE :hostnamePattern)
                   OR (:logTextPattern IS NOT NULL AND log_text LIKE :logTextPattern))
              AND (:fromDate IS NULL OR created_date >= :fromDate)
              AND (:toDate IS NULL OR created_date < :toDate)
            """)
    Page<FirewallSysLog> findAllWithFilters(
            @Param("severity") String severity,
            @Param("hostnamePattern") String hostnamePattern,
            @Param("logTextPattern") String logTextPattern,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            Pageable pageable
    );

    @Query(value = """
            SELECT TOP(:size) id, facility, severity, hostname, log_text, is_sync, created_date, date_report
            FROM firewall_syslogs
            WHERE (:fromDate IS NULL OR created_date >= :fromDate)
              AND (:toDate IS NULL OR created_date < :toDate)
              AND (:severity IS NULL OR severity = :severity)
              AND ((:hostnamePrefix IS NULL AND :logTextPattern IS NULL)
                   OR (:hostnamePrefix IS NOT NULL AND hostname LIKE :hostnamePrefix)
                   OR (:logTextPattern IS NOT NULL AND log_text LIKE :logTextPattern))
              AND (:lastCreated IS NULL OR (created_date < :lastCreated OR (created_date = :lastCreated AND id < :lastId)))
            ORDER BY created_date DESC, id DESC
            """, nativeQuery = true)
    List<FirewallSysLog> findKeyset(
            @Param("severity") String severity,
            @Param("hostnamePrefix") String hostnamePrefix,
            @Param("logTextPattern") String logTextPattern,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            @Param("lastCreated") LocalDateTime lastCreated,
            @Param("lastId") Long lastId,
            @Param("size") int size
    );
}
