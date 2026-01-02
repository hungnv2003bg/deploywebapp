package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.SysLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

public interface SysLogRepository extends JpaRepository<SysLog, Long> {
    List<SysLog> findBySeverityIgnoreCase(String severity);

    @Query("SELECT s FROM SysLog s WHERE (s.mailSent IS NULL OR s.mailSent = false) AND s.severity IS NOT NULL ORDER BY s.createdDate DESC")
    List<SysLog> findPendingMail(Pageable pageable);

    @Modifying
    @Transactional
    @Query("UPDATE SysLog s SET s.mailSent = true WHERE s.id IN :ids")
    int markMailSent(@Param("ids") List<Long> ids);
    
    @Query(value = "SELECT s.id, s.factoryid, s.userit_id, s.severity, s.hostname, s.log_text, s.created_date, s.status, s.action_taken, s.completed_at, s.collaborator, s.syslog_deviceid, s.mail_sent FROM syslogs s WHERE " +
           "((:severity IS NULL OR :severity = '') OR LOWER(s.severity) = LOWER(:severity)) AND " +
           "((:search IS NULL OR :search = '') OR (LOWER(s.hostname) LIKE '%' + LOWER(:search) + '%' OR LOWER(CAST(s.log_text AS NVARCHAR(MAX))) LIKE '%' + LOWER(:search) + '%')) AND " +
           "(:status IS NULL OR s.status = :status) AND " +
           "(:startDate IS NULL OR s.created_date >= :startDate) AND " +
           "(:endDate IS NULL OR s.created_date <= :endDate) " +
           "ORDER BY s.created_date DESC", nativeQuery = true)
    List<SysLog> findWithFilters(
        @Param("severity") String severity,
        @Param("search") String search,
        @Param("status") Integer status,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    // Query với JOIN để filter factoryName ở database level và hỗ trợ pagination
    @Query(value = "SELECT s.id, s.factoryid, s.userit_id, s.severity, s.hostname, s.log_text, s.created_date, s.status, s.action_taken, s.completed_at, s.collaborator, s.syslog_deviceid, s.mail_sent FROM syslogs s " +
           "WHERE ((:severity IS NULL OR :severity = '') OR LOWER(s.severity) = LOWER(:severity)) AND " +
           "((:search IS NULL OR :search = '') OR (LOWER(s.hostname) LIKE '%' + LOWER(:search) + '%' OR LOWER(CAST(s.log_text AS NVARCHAR(MAX))) LIKE '%' + LOWER(:search) + '%')) AND " +
           "(:status IS NULL OR s.status = :status) AND " +
           "(:startDate IS NULL OR s.created_date >= :startDate) AND " +
           "(:endDate IS NULL OR s.created_date <= :endDate) AND " +
           "((:factoryName IS NULL OR :factoryName = '') OR EXISTS (" +
           "    SELECT 1 FROM syslog_user su " +
           "    WHERE su.factoryid = s.factoryid AND LOWER(su.factory_name) = LOWER(:factoryName)" +
           ")) " +
           "ORDER BY s.created_date DESC",
           countQuery = "SELECT COUNT(s.id) FROM syslogs s " +
           "WHERE ((:severity IS NULL OR :severity = '') OR LOWER(s.severity) = LOWER(:severity)) AND " +
           "((:search IS NULL OR :search = '') OR (LOWER(s.hostname) LIKE '%' + LOWER(:search) + '%' OR LOWER(CAST(s.log_text AS NVARCHAR(MAX))) LIKE '%' + LOWER(:search) + '%')) AND " +
           "(:status IS NULL OR s.status = :status) AND " +
           "(:startDate IS NULL OR s.created_date >= :startDate) AND " +
           "(:endDate IS NULL OR s.created_date <= :endDate) AND " +
           "((:factoryName IS NULL OR :factoryName = '') OR EXISTS (" +
           "    SELECT 1 FROM syslog_user su " +
           "    WHERE su.factoryid = s.factoryid AND LOWER(su.factory_name) = LOWER(:factoryName)" +
           "))",
           nativeQuery = true)
    Page<SysLog> findWithFiltersAndPagination(
        @Param("severity") String severity,
        @Param("search") String search,
        @Param("status") Integer status,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate,
        @Param("factoryName") String factoryName,
        Pageable pageable
    );
    
    // Query để đếm số lượng theo từng severity (chỉ COUNT, không load data)
    // Filter theo visibleSeverities sẽ được thực hiện trong Service layer
    @Query(value = "SELECT s.severity, COUNT(s.id) as count FROM syslogs s " +
           "WHERE ((:search IS NULL OR :search = '') OR (LOWER(s.hostname) LIKE '%' + LOWER(:search) + '%' OR LOWER(CAST(s.log_text AS NVARCHAR(MAX))) LIKE '%' + LOWER(:search) + '%')) AND " +
           "((:deviceId IS NULL) OR s.syslog_deviceid = :deviceId) AND " +
           "(:status IS NULL OR s.status = :status) AND " +
           "(:startDate IS NULL OR s.created_date >= :startDate) AND " +
           "(:endDate IS NULL OR s.created_date <= :endDate) AND " +
           "((:factoryName IS NULL OR :factoryName = '') OR EXISTS (" +
           "    SELECT 1 FROM syslog_user su " +
           "    WHERE su.factoryid = s.factoryid AND LOWER(su.factory_name) = LOWER(:factoryName)" +
           ")) " +
           "GROUP BY s.severity " +
           "HAVING s.severity IS NOT NULL", nativeQuery = true)
    List<Object[]> countBySeverity(
        @Param("search") String search,
        @Param("deviceId") Integer deviceId,
        @Param("status") Integer status,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate,
        @Param("factoryName") String factoryName
    );
    
    @Query(value = "SELECT s.userit_id AS userId, s.factoryid AS factoryId, COUNT(*) AS total " +
           "FROM syslogs s " +
           "WHERE s.status IN (0,1) AND s.userit_id IS NOT NULL " +
           "GROUP BY s.userit_id, s.factoryid", nativeQuery = true)
    List<Object[]> countOpenByUserAndFactory();
    
    // Query để thống kê syslogs theo severity, khu vực (factoryName) và status
    // Trả về: severity, factoryName, status, count
    @Query(value = "SELECT s.severity, su.factory_name, s.status, COUNT(s.id) as count " +
           "FROM syslogs s " +
           "LEFT JOIN syslog_user su ON s.factoryid = su.factoryid " +
           "WHERE ((:factoryName IS NULL OR :factoryName = '' OR :factoryName = 'ALL') OR LOWER(su.factory_name) = LOWER(:factoryName)) AND " +
           "(:startDate IS NULL OR s.created_date >= :startDate) AND " +
           "(:endDate IS NULL OR s.created_date <= :endDate) AND " +
           "s.severity IS NOT NULL " +
           "GROUP BY s.severity, su.factory_name, s.status " +
           "HAVING s.severity IS NOT NULL", nativeQuery = true)
    List<Object[]> countBySeverityAndAreaAndStatus(
        @Param("factoryName") String factoryName,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    // Query để cập nhật hàng loạt syslog dựa trên filter
    @Modifying
    @Transactional
    @Query(value = "UPDATE syslogs " +
           "SET status = :newStatus, " +
           "    action_taken = CASE WHEN :actionTaken IS NULL OR :actionTaken = '' THEN action_taken ELSE :actionTaken END, " +
           "    completed_at = CASE " +
           "        WHEN :newStatus = 2 AND completed_at IS NULL THEN GETDATE() " +
           "        WHEN :newStatus = 2 AND completed_at IS NOT NULL THEN completed_at " +
           "        ELSE NULL " +
           "    END " +
           "WHERE id IN (" +
           "    SELECT s.id FROM syslogs s " +
           "    LEFT JOIN syslog_user su ON s.factoryid = su.factoryid " +
           "    LEFT JOIN syslog_device sd ON sd.id = s.syslog_deviceid " +
           "    WHERE ((:severity IS NULL OR :severity = '') OR LOWER(s.severity) = LOWER(:severity)) AND " +
           "    ((:search IS NULL OR :search = '') OR (LOWER(s.hostname) LIKE '%' + LOWER(:search) + '%' OR LOWER(CAST(s.log_text AS NVARCHAR(MAX))) LIKE '%' + LOWER(:search) + '%')) AND " +
           "    (:status IS NULL OR s.status = :status) AND " +
           "    (:startDate IS NULL OR s.created_date >= :startDate) AND " +
           "    (:endDate IS NULL OR s.created_date <= :endDate) AND " +
           "    ((:factoryName IS NULL OR :factoryName = '') OR LOWER(su.factory_name) = LOWER(:factoryName)) AND " +
           "    ((:deviceId IS NULL) OR s.syslog_deviceid = :deviceId)" +
           ")", 
           nativeQuery = true)
    int updateBatchByFilters(
        @Param("severity") String severity,
        @Param("search") String search,
        @Param("deviceId") Integer deviceId,
        @Param("status") Integer status,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate,
        @Param("factoryName") String factoryName,
        @Param("newStatus") Integer newStatus,
        @Param("actionTaken") String actionTaken
    );
}


