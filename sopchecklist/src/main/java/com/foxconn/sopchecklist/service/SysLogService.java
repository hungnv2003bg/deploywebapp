package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.dto.SysLogDTO;
import com.foxconn.sopchecklist.entity.SysLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface SysLogService {
    SysLog findById(Long id);
    List<SysLog> findAll();
    List<SysLog> findBySeverity(String severity);
    List<SysLogDTO> findAllWithDetails();
    List<SysLogDTO> findBySeverityWithDetails(String severity);
    List<SysLogDTO> findWithFilters(String severity, String search, String factoryName, Integer status, LocalDateTime startDate, LocalDateTime endDate);
    Page<SysLogDTO> findWithFiltersAndPagination(String severity, String search, String factoryName, Integer deviceId, Integer status, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);
    Map<String, Long> getCountsBySeverity(String search, String factoryName, Integer deviceId, Integer status, LocalDateTime startDate, LocalDateTime endDate);
    List<com.foxconn.sopchecklist.dto.SyslogSeverityStatistic> getStatisticsBySeverityAndArea(String area, LocalDateTime from, LocalDateTime to);
    List<com.foxconn.sopchecklist.dto.SyslogSeverityStatusStatistic> getStatisticsBySeverityAndAreaWithStatus(String area, LocalDateTime from, LocalDateTime to);
    SysLog save(SysLog sysLog);
    SysLog update(SysLog sysLog);
    void delete(Long id);
    int updateBatchByFilters(String severity, String search, Integer deviceId, String factoryName, Integer status, LocalDateTime startDate, LocalDateTime endDate, Integer newStatus, String actionTaken);
}


