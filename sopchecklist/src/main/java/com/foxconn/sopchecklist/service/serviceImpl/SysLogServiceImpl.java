package com.foxconn.sopchecklist.service.serviceImpl;

import com.foxconn.sopchecklist.dto.SysLogDTO;
import com.foxconn.sopchecklist.dto.SyslogFileDTO;
import com.foxconn.sopchecklist.dto.SyslogSeverityStatistic;
import com.foxconn.sopchecklist.dto.SyslogSeverityStatusStatistic;
import com.foxconn.sopchecklist.entity.SysLog;
import com.foxconn.sopchecklist.repository.SysLogRepository;
import com.foxconn.sopchecklist.repository.SysLogUserRepository;
import com.foxconn.sopchecklist.repository.UsersRepository;
import com.foxconn.sopchecklist.service.SysLogService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;
import java.util.ArrayList;

@Service
public class SysLogServiceImpl implements SysLogService {

    private final SysLogRepository repository;
    private final SysLogUserRepository sysLogUserRepository;
    private final UsersRepository usersRepository;
    private final com.foxconn.sopchecklist.repository.SyslogDeviceRepository syslogDeviceRepository;
    
    @PersistenceContext
    private EntityManager entityManager;

    public SysLogServiceImpl(SysLogRepository repository, SysLogUserRepository sysLogUserRepository, UsersRepository usersRepository, com.foxconn.sopchecklist.repository.SyslogDeviceRepository syslogDeviceRepository) {
        this.repository = repository;
        this.sysLogUserRepository = sysLogUserRepository;
        this.usersRepository = usersRepository;
        this.syslogDeviceRepository = syslogDeviceRepository;
    }

    @Override
    public SysLog findById(Long id) {
        return repository.findById(id).orElse(null);
    }

    /**
     * Tìm syslog theo ID và trả về DTO với đầy đủ thông tin
     */
    public SysLogDTO findByIdAsDTO(Long id) {
        SysLog sysLog = repository.findById(id).orElse(null);
        if (sysLog == null) {
            return null;
        }
        List<SysLogDTO> dtos = mapToDTO(java.util.Collections.singletonList(sysLog));
        return dtos.isEmpty() ? null : dtos.get(0);
    }

    @Override
    public List<SysLog> findAll() {
        return repository.findAll();
    }

    @Override
    public List<SysLog> findBySeverity(String severity) {
        return repository.findBySeverityIgnoreCase(severity);
    }

    @Override
    public List<SysLogDTO> findAllWithDetails() {
        List<SysLog> logs = repository.findAll();
        return mapToDTO(logs);
    }

    @Override
    public List<SysLogDTO> findBySeverityWithDetails(String severity) {
        List<SysLog> logs = repository.findBySeverityIgnoreCase(severity);
        return mapToDTO(logs);
    }

    @Override
    public List<SysLogDTO> findWithFilters(String severity, String search, String factoryName, Integer status, LocalDateTime startDate, LocalDateTime endDate) {
        List<SysLog> logs = repository.findWithFilters(severity, search, status, startDate, endDate);
        List<SysLogDTO> dtos = mapToDTO(logs);
        
        // Filter by factoryName after mapping DTO (because we need factoryName from SysLogUser)
        if (factoryName != null && !factoryName.isBlank()) {
            String factoryNameLower = factoryName.trim().toLowerCase();
            dtos = dtos.stream()
                .filter(dto -> dto.getFactoryName() != null && 
                              dto.getFactoryName().toLowerCase().equals(factoryNameLower))
                .collect(Collectors.toList());
        }
        
        return dtos;
    }
    
    @Override
    public Page<SysLogDTO> findWithFiltersAndPagination(String severity, String search, String factoryName, Integer deviceId, Integer status, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        try {
            // Build WHERE clause
            StringBuilder whereClause = new StringBuilder();
            List<Object> params = new ArrayList<>();
            org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(SysLogServiceImpl.class);
            
            if (severity != null && !severity.isBlank()) {
                whereClause.append(" AND LOWER(s.severity) = LOWER(?)");
                params.add(severity.trim());
            }
            
            if (search != null && !search.isBlank()) {
                whereClause.append(" AND (LOWER(s.hostname) LIKE ? OR LOWER(CAST(s.log_text AS NVARCHAR(MAX))) LIKE ?)");
                String searchPattern = "%" + search.trim().toLowerCase() + "%";
                params.add(searchPattern);
                params.add(searchPattern);
            }
            
            if (status != null) {
                whereClause.append(" AND s.status = ?");
                params.add(status);
            }
            
            if (startDate != null) {
                whereClause.append(" AND s.created_date >= ?");
                params.add(startDate);
            }
            
            if (endDate != null) {
                whereClause.append(" AND s.created_date <= ?");
                params.add(endDate);
            }
            
            if (factoryName != null && !factoryName.isBlank()) {
                whereClause.append(" AND EXISTS (SELECT 1 FROM syslog_user su WHERE su.factoryid = s.factoryid AND LOWER(su.factory_name) = LOWER(?))");
                params.add(factoryName.trim());
            }
            
            if (deviceId != null) {
                whereClause.append(" AND s.syslog_deviceid = ?");
                params.add(deviceId);
            }
            
            logger.info("whereClause={} params={}", whereClause.toString(), params);
            
            // Build count query
            String countSql = "SELECT COUNT(s.id) FROM syslogs s WHERE 1=1" + whereClause.toString();
            Query countQuery = entityManager.createNativeQuery(countSql);
            for (int i = 0; i < params.size(); i++) {
                countQuery.setParameter(i + 1, params.get(i));
            }
            Long totalCount = ((Number) countQuery.getSingleResult()).longValue();
            
            // Build data query with OFFSET/FETCH (SQL Server syntax)
            int offset = (int) pageable.getOffset();
            int pageSize = pageable.getPageSize();
            String dataSql = "SELECT s.id, s.factoryid, s.userit_id, s.severity, s.hostname, s.log_text, s.created_date, s.status, s.action_taken, s.completed_at, s.collaborator, s.syslog_deviceid, s.mail_sent, s.last_edited_at, s.last_edited_by " +
                           "FROM syslogs s " +
                           "WHERE 1=1" + whereClause.toString() + " " +
                           "ORDER BY s.created_date DESC " +
                           "OFFSET ? ROWS FETCH NEXT ? ROWS ONLY";
            
            logger.info("dataSql={} offset={} pageSize={}", dataSql, offset, pageSize);
            
            Query dataQuery = entityManager.createNativeQuery(dataSql, SysLog.class);
            for (int i = 0; i < params.size(); i++) {
                dataQuery.setParameter(i + 1, params.get(i));
            }
            dataQuery.setParameter(params.size() + 1, offset);
            dataQuery.setParameter(params.size() + 2, pageSize);
            
            @SuppressWarnings("unchecked")
            List<SysLog> sysLogs = dataQuery.getResultList();
            logger.info("resultCount={}", sysLogs != null ? sysLogs.size() : 0);
            
            List<SysLogDTO> dtos = mapToDTO(sysLogs);
            return new PageImpl<>(dtos, pageable, totalCount);
        } catch (Exception e) {
            System.err.println("Error in findWithFiltersAndPagination: " + e.getMessage());
            e.printStackTrace();
            return new PageImpl<>(new ArrayList<>(), pageable, 0);
        }
    }
    
    @Override
    public Map<String, Long> getCountsBySeverity(String search, String factoryName, Integer deviceId, Integer status, LocalDateTime startDate, LocalDateTime endDate) {
        // Không filter theo visibleSeverities ở đây, để method này có thể dùng cho mục đích khác
        return getCountsBySeverity(search, factoryName, deviceId, status, startDate, endDate, null);
    }
    
    // Overload method với visibleSeverities để tối ưu query
    public Map<String, Long> getCountsBySeverity(String search, String factoryName, Integer deviceId, Integer status, LocalDateTime startDate, LocalDateTime endDate, java.util.List<String> visibleSeverities) {
        try {
            // Lấy tất cả counts từ database (không filter theo severity trong query)
            List<Object[]> results = repository.countBySeverity(
                search != null && !search.isBlank() ? search.trim() : null,
                deviceId,
                status,
                startDate,
                endDate,
                factoryName != null && !factoryName.isBlank() ? factoryName.trim() : null
            );
            
            Map<String, Long> allCounts = new HashMap<>();
            if (results != null) {
                for (Object[] result : results) {
                    if (result != null && result.length >= 2 && result[0] != null) {
                        String severity = (String) result[0];
                        Long count = result[1] != null ? ((Number) result[1]).longValue() : 0L;
                        if (severity != null && !severity.trim().isEmpty()) {
                            allCounts.put(severity, count);
                        }
                    }
                }
            }
            
            // Filter chỉ lấy những severity được phép hiển thị
            Map<String, Long> filteredCounts = new HashMap<>();
            if (visibleSeverities != null && !visibleSeverities.isEmpty()) {
                for (String sev : visibleSeverities) {
                    // So sánh không phân biệt hoa thường
                    String severityKey = allCounts.keySet().stream()
                        .filter(key -> key != null && key.equalsIgnoreCase(sev))
                        .findFirst()
                        .orElse(null);
                    
                    if (severityKey != null) {
                        filteredCounts.put(sev, allCounts.get(severityKey));
                    } else {
                        filteredCounts.put(sev, 0L);
                    }
                }
            } else {
                // Nếu không có visibleSeverities, trả về tất cả
                filteredCounts = allCounts;
            }
            
            return filteredCounts;
        } catch (Exception e) {
            // Log error and return empty map
            System.err.println("Error getting counts by severity: " + e.getMessage());
            e.printStackTrace();
            return new HashMap<>();
        }
    }

    private List<SysLogDTO> mapToDTO(List<SysLog> logs) {
        return logs.stream().map(log -> {
            SysLogDTO dto = new SysLogDTO();
            dto.setId(log.getId());
            dto.setFactoryId(log.getFactoryId());
            dto.setUserId(log.getUserId());
            dto.setSeverity(log.getSeverity());
            dto.setHostname(log.getHostname());
            dto.setLogText(log.getLogText());
            dto.setCreatedDate(log.getCreatedDate());
            dto.setStatus(log.getStatus());
            dto.setActionTaken(log.getActionTaken());
            dto.setCompletedAt(log.getCompletedAt());
            dto.setCollaborator(log.getCollaborator());
            dto.setLastEditedAt(log.getLastEditedAt());
            dto.setLastEditedBy(log.getLastEditedBy());

            // Get factory name
            if (log.getFactoryId() != null) {
                sysLogUserRepository.findByFactoryId(log.getFactoryId())
                    .ifPresent(sysLogUser -> dto.setFactoryName(sysLogUser.getFactoryName()));
            }

            // Get user full name
            if (log.getUserId() != null) {
                usersRepository.findById(log.getUserId())
                    .ifPresent(user -> dto.setUserFullName(user.getFullName()));
            }
            
            // Get device name
            if (log.getSyslogDeviceId() != null) {
                syslogDeviceRepository.findById(log.getSyslogDeviceId())
                        .ifPresent(dev -> dto.setDeviceName(dev.getDeviceName()));
            }

            // Map files
            if (log.getFiles() != null) {
                List<SyslogFileDTO> fileDTOs = log.getFiles().stream().map(file -> {
                    SyslogFileDTO fileDTO = new SyslogFileDTO();
                    fileDTO.setId(file.getId());
                    fileDTO.setFilePath(file.getFilePath());
                    fileDTO.setFileName(file.getFileName());
                    fileDTO.setFileType(file.getFileType());
                    fileDTO.setFileSize(file.getFileSize());
                    fileDTO.setCreatedAt(file.getCreatedAt());
                    return fileDTO;
                }).collect(Collectors.toList());
                dto.setFiles(fileDTOs);
            } else {
                dto.setFiles(new ArrayList<>());
            }

            return dto;
        }).collect(Collectors.toList());
    }

    @Override
    public SysLog save(SysLog sysLog) {
        return repository.save(sysLog);
    }

    @Override
    public SysLog update(SysLog sysLog) {
        return repository.save(sysLog);
    }

    @Override
    public void delete(Long id) {
        repository.deleteById(id);
    }
    
    @Override
    public int updateBatchByFilters(String severity, String search, Integer deviceId, String factoryName, Integer status, LocalDateTime startDate, LocalDateTime endDate, Integer newStatus, String actionTaken) {
        return repository.updateBatchByFilters(
            severity != null && !severity.isBlank() ? severity.trim() : null,
            search != null && !search.isBlank() ? search.trim() : null,
            deviceId,
            status,
            startDate,
            endDate,
            factoryName != null && !factoryName.isBlank() ? factoryName.trim() : null,
            newStatus,
            actionTaken
        );
    }
    
    @Override
    public List<SyslogSeverityStatistic> getStatisticsBySeverityAndArea(String area, LocalDateTime from, LocalDateTime to) {
        try {
            // Danh sách severity levels theo thứ tự chuẩn
            List<String> severityLevels = new ArrayList<>();
            severityLevels.add("Emergency");
            severityLevels.add("Alert");
            severityLevels.add("Critical");
            severityLevels.add("Error");
            severityLevels.add("Warning");
            severityLevels.add("Notice");
            severityLevels.add("Info");
            severityLevels.add("Debug");
            
            // Query dữ liệu từ database
            String normalizedArea = (area != null && !area.isBlank() && !area.equalsIgnoreCase("ALL")) ? area.trim() : null;
            List<Object[]> results = repository.countBySeverityAndAreaAndStatus(normalizedArea, from, to);
            
            // Tạo map để nhóm dữ liệu theo severity, area và status
            // Map<severity, Map<area, Map<status, count>>>
            Map<String, Map<String, Map<String, Long>>> severityMap = new HashMap<>();
            for (Object[] result : results) {
                if (result != null && result.length >= 4) {
                    String severity = result[0] != null ? (String) result[0] : null;
                    String factoryName = result[1] != null ? (String) result[1] : null;
                    Integer status = result[2] != null ? ((Number) result[2]).intValue() : null;
                    Long count = result[3] != null ? ((Number) result[3]).longValue() : 0L;
                    
                    if (severity != null && status != null) {
                        severityMap.putIfAbsent(severity, new HashMap<>());
                        if (factoryName != null && !factoryName.trim().isEmpty()) {
                            String normalizedFactoryName = normalizeFactoryName(factoryName);
                            // Nếu normalize trả về null, dùng factoryName gốc (uppercase)
                            if (normalizedFactoryName == null) {
                                normalizedFactoryName = factoryName.trim().toUpperCase();
                            }
                            severityMap.get(severity).putIfAbsent(normalizedFactoryName, new HashMap<>());
                            String statusKey = status.toString(); // "0", "1", "2", "3"
                            Long currentCount = severityMap.get(severity).get(normalizedFactoryName).getOrDefault(statusKey, 0L);
                            severityMap.get(severity).get(normalizedFactoryName).put(statusKey, currentCount + count);
                        }
                    }
                }
            }
            
            // Tạo danh sách kết quả theo thứ tự severity levels
            List<SyslogSeverityStatistic> statistics = new ArrayList<>();
            for (String severity : severityLevels) {
                Map<String, Map<String, Long>> byAreaMap = severityMap.getOrDefault(severity, new HashMap<>());
                // Tính tổng từ tất cả các giá trị trong byAreaMap
                Long total = byAreaMap.values().stream()
                        .flatMap(statusMap -> statusMap.values().stream())
                        .mapToLong(Long::longValue)
                        .sum();
                // Store status info in a way frontend can parse
                // Format: areaName -> total, areaName_0 -> status 0 count, areaName_1 -> status 1 count, etc.
                Map<String, Long> byAreaWithStatus = new HashMap<>();
                for (Map.Entry<String, Map<String, Long>> areaEntry : byAreaMap.entrySet()) {
                    String areaName = areaEntry.getKey();
                    Map<String, Long> statusMap = areaEntry.getValue();
                    // Store total for the area
                    Long areaTotal = statusMap.values().stream().mapToLong(Long::longValue).sum();
                    byAreaWithStatus.put(areaName, areaTotal);
                    // Store status breakdown: "VT1_0" -> count for status 0, "VT1_1" -> count for status 1, etc.
                    for (int status = 0; status <= 3; status++) {
                        Long count = statusMap.getOrDefault(String.valueOf(status), 0L);
                        byAreaWithStatus.put(areaName + "_" + status, count);
                    }
                }
                statistics.add(new SyslogSeverityStatistic(severity, total, byAreaWithStatus));
            }
            
            return statistics;
        } catch (Exception e) {
            System.err.println("Error getting statistics by severity and area: " + e.getMessage());
            e.printStackTrace();
            // Trả về danh sách rỗng với tất cả severity levels
            List<SyslogSeverityStatistic> emptyStats = new ArrayList<>();
            List<String> severityLevels = new ArrayList<>();
            severityLevels.add("Emergency");
            severityLevels.add("Alert");
            severityLevels.add("Critical");
            severityLevels.add("Error");
            severityLevels.add("Warning");
            severityLevels.add("Notice");
            severityLevels.add("Info");
            severityLevels.add("Debug");
            for (String severity : severityLevels) {
                emptyStats.add(new SyslogSeverityStatistic(severity, 0L, new HashMap<>()));
            }
            return emptyStats;
        }
    }
    
    @Override
    public List<SyslogSeverityStatusStatistic> getStatisticsBySeverityAndAreaWithStatus(String area, LocalDateTime from, LocalDateTime to) {
        try {
            // Danh sách severity levels theo thứ tự chuẩn
            List<String> severityLevels = new ArrayList<>();
            severityLevels.add("Emergency");
            severityLevels.add("Alert");
            severityLevels.add("Critical");
            severityLevels.add("Error");
            severityLevels.add("Warning");
            severityLevels.add("Notice");
            severityLevels.add("Info");
            severityLevels.add("Debug");
            
            // Query dữ liệu từ database
            String normalizedArea = (area != null && !area.isBlank() && !area.equalsIgnoreCase("ALL")) ? area.trim() : null;
            List<Object[]> results = repository.countBySeverityAndAreaAndStatus(normalizedArea, from, to);
            
            // Tạo map để nhóm dữ liệu theo severity, area và status
            // Map<severity, Map<area, Map<status, count>>>
            Map<String, Map<String, Map<String, Long>>> severityMap = new HashMap<>();
            for (Object[] result : results) {
                if (result != null && result.length >= 4) {
                    String severity = result[0] != null ? (String) result[0] : null;
                    String factoryName = result[1] != null ? (String) result[1] : null;
                    Integer status = result[2] != null ? ((Number) result[2]).intValue() : null;
                    Long count = result[3] != null ? ((Number) result[3]).longValue() : 0L;
                    
                    if (severity != null && status != null) {
                        severityMap.putIfAbsent(severity, new HashMap<>());
                        if (factoryName != null && !factoryName.trim().isEmpty()) {
                            String normalizedFactoryName = normalizeFactoryName(factoryName);
                            // Nếu normalize trả về null, dùng factoryName gốc (uppercase)
                            if (normalizedFactoryName == null) {
                                normalizedFactoryName = factoryName.trim().toUpperCase();
                            }
                            severityMap.get(severity).putIfAbsent(normalizedFactoryName, new HashMap<>());
                            String statusKey = status.toString(); // "0", "1", "2", "3"
                            Long currentCount = severityMap.get(severity).get(normalizedFactoryName).getOrDefault(statusKey, 0L);
                            severityMap.get(severity).get(normalizedFactoryName).put(statusKey, currentCount + count);
                        }
                    }
                }
            }
            
            // Tạo danh sách kết quả theo thứ tự severity levels
            List<SyslogSeverityStatusStatistic> statistics = new ArrayList<>();
            for (String severity : severityLevels) {
                Map<String, Map<String, Long>> byAreaMapNested = severityMap.getOrDefault(severity, new HashMap<>());
                
                // Tính tổng theo status (tổng tất cả area)
                Long pending = 0L;
                Long doing = 0L;
                Long completed = 0L;
                Long cancelled = 0L;
                
                // Transform nested map to flat map format that frontend expects
                // Frontend expects: { "VT1": total, "VT1_0": pending, "VT1_1": doing, "VT1_2": completed, "VT1_3": cancelled }
                Map<String, Long> byAreaMapFlat = new HashMap<>();
                for (Map.Entry<String, Map<String, Long>> areaEntry : byAreaMapNested.entrySet()) {
                    String areaName = areaEntry.getKey();
                    Map<String, Long> statusMap = areaEntry.getValue();
                    
                    Long areaPending = statusMap.getOrDefault("0", 0L);
                    Long areaDoing = statusMap.getOrDefault("1", 0L);
                    Long areaCompleted = statusMap.getOrDefault("2", 0L);
                    Long areaCancelled = statusMap.getOrDefault("3", 0L);
                    Long areaTotal = areaPending + areaDoing + areaCompleted + areaCancelled;
                    
                    // Create flat map structure for this area
                    byAreaMapFlat.put(areaName, areaTotal); // Total for the area
                    byAreaMapFlat.put(areaName + "_0", areaPending); // Pending
                    byAreaMapFlat.put(areaName + "_1", areaDoing); // Doing
                    byAreaMapFlat.put(areaName + "_2", areaCompleted); // Completed
                    byAreaMapFlat.put(areaName + "_3", areaCancelled); // Cancelled
                    
                    // Accumulate totals
                    pending += areaPending;
                    doing += areaDoing;
                    completed += areaCompleted;
                    cancelled += areaCancelled;
                }
                
                Long total = pending + doing + completed + cancelled;
                statistics.add(new SyslogSeverityStatusStatistic(severity, pending, doing, completed, total, byAreaMapFlat));
            }
            
            return statistics;
        } catch (Exception e) {
            System.err.println("Error getting statistics by severity and area with status: " + e.getMessage());
            e.printStackTrace();
            // Trả về danh sách rỗng với tất cả severity levels
            List<SyslogSeverityStatusStatistic> emptyStats = new ArrayList<>();
            List<String> severityLevels = new ArrayList<>();
            severityLevels.add("Emergency");
            severityLevels.add("Alert");
            severityLevels.add("Critical");
            severityLevels.add("Error");
            severityLevels.add("Warning");
            severityLevels.add("Notice");
            severityLevels.add("Info");
            severityLevels.add("Debug");
            for (String severity : severityLevels) {
                emptyStats.add(new SyslogSeverityStatusStatistic(severity, 0L, 0L, 0L, 0L, new HashMap<>()));
            }
            return emptyStats;
        }
    }
    
    /**
     * Normalize factory name để đảm bảo consistency (VT1, VT2A, VT2B, VTC, DV)
     */
    private String normalizeFactoryName(String factoryName) {
        if (factoryName == null || factoryName.trim().isEmpty()) {
            return null;
        }
        String normalized = factoryName.trim().toUpperCase();
        // Map các tên có thể có
        if (normalized.contains("VT1")) return "VT1";
        if (normalized.contains("VT2A") || normalized.contains("VT2-A")) return "VT2A";
        if (normalized.contains("VT2B") || normalized.contains("VT2-B")) return "VT2B";
        if (normalized.contains("VTC")) return "VTC";
        if (normalized.contains("DV")) return "DV";
        return normalized;
    }
}
