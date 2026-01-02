package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.dto.SysLogDTO;
import com.foxconn.sopchecklist.dto.SyslogFileDTO;
import com.foxconn.sopchecklist.entity.SysLog;
import com.foxconn.sopchecklist.entity.SyslogFile;
import com.foxconn.sopchecklist.service.SysLogService;
import com.foxconn.sopchecklist.service.SyslogSettingService;
import com.foxconn.sopchecklist.service.TimeService;
import com.foxconn.sopchecklist.service.MailSyslogService;
import com.foxconn.sopchecklist.repository.SysLogUserRepository;
import com.foxconn.sopchecklist.repository.SyslogDeviceRepository;
import com.foxconn.sopchecklist.entity.SysLogUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/syslogs")
@CrossOrigin
public class SysLogController {

    private final SysLogService service;
    private final TimeService timeService;
    private final SyslogSettingService syslogSettingService;
    private final MailSyslogService mailSyslogService;
    private final SysLogUserRepository sysLogUserRepository;
    private final SyslogDeviceRepository syslogDeviceRepository;
    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(SysLogController.class);

    public SysLogController(SysLogService service, TimeService timeService, SyslogSettingService syslogSettingService, MailSyslogService mailSyslogService, SysLogUserRepository sysLogUserRepository, SyslogDeviceRepository syslogDeviceRepository) {
        this.service = service;
        this.timeService = timeService;
        this.syslogSettingService = syslogSettingService;
        this.mailSyslogService = mailSyslogService;
        this.sysLogUserRepository = sysLogUserRepository;
        this.syslogDeviceRepository = syslogDeviceRepository;
    }

    @GetMapping
    public Page<SysLogDTO> findAll(
            @RequestParam(value = "severity", required = false) String severity,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "factoryName", required = false) String factoryName,
            @RequestParam(value = "deviceId", required = false) Integer deviceId,
            @RequestParam(value = "status", required = false) Integer status,
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        
        logger.info("findAll severity={}, search={}, factoryName={}, deviceId={}, status={}, startDate={}, endDate={}, page={}, size={}",
                severity, search, factoryName, deviceId, status, startDate, endDate, page, size);
        
        // Kiểm tra severity có trong danh sách được phép hiển thị không
        if (severity != null && !severity.isBlank()) {
            java.util.List<String> visibleSeverities = syslogSettingService.getVisibleSeverities();
            if (!visibleSeverities.contains(severity.trim())) {
                // Severity không được phép, trả về page rỗng
                Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1));
                return new org.springframework.data.domain.PageImpl<>(new java.util.ArrayList<>(), pageable, 0);
            }
        }
        
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1));
        
        // Luôn sử dụng pagination để tối ưu hiệu năng
        return service.findWithFiltersAndPagination(
            severity != null && !severity.isBlank() ? severity.trim() : null,
            search != null && !search.isBlank() ? search.trim() : null,
            factoryName != null && !factoryName.isBlank() ? factoryName.trim() : null,
            deviceId,
            status,
            startDate,
            endDate,
            pageable
        );
    }

    @GetMapping("/factories")
    public List<String> getFactoryNames() {
        List<SysLogUser> all = sysLogUserRepository.findAll();
        return all.stream()
                .map(SysLogUser::getFactoryName)
                .filter(name -> name != null && !name.trim().isEmpty())
                .map(String::trim)
                .distinct()
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .collect(Collectors.toList());
    }
    
    @GetMapping("/devices")
    public List<com.foxconn.sopchecklist.entity.SyslogDevice> getDeviceNames() {
        return syslogDeviceRepository.findAll();
    }

    @GetMapping("/statistics")
    public ResponseEntity<List<com.foxconn.sopchecklist.dto.SyslogSeverityStatusStatistic>> getStatisticsBySeverityAndArea(
            @RequestParam(value = "area", defaultValue = "ALL") String area,
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        
        logger.info("statistics area={}, from={}, to={}", area, from, to);
        
        try {
            List<com.foxconn.sopchecklist.dto.SyslogSeverityStatusStatistic> statistics = service.getStatisticsBySeverityAndAreaWithStatus(area, from, to);
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            System.err.println("Error in getStatisticsBySeverityAndArea: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(new java.util.ArrayList<>());
        }
    }

    @GetMapping("/counts")
    public ResponseEntity<Map<String, Object>> getCountsBySeverity(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "factoryName", required = false) String factoryName,
            @RequestParam(value = "deviceId", required = false) Integer deviceId,
            @RequestParam(value = "status", required = false) Integer status,
            @RequestParam(value = "range", required = false) String rangeKey,
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        logger.info("counts search={}, factoryName={}, deviceId={}, status={}, startDate={}, endDate={}, range={}", 
                search, factoryName, deviceId, status, startDate, endDate, rangeKey);
        
        try {
            // Nếu client gửi rangeKey, server sẽ tự tính khoảng thời gian theo giờ server
            if (rangeKey != null && !rangeKey.isBlank()) {
                ZoneId zone = ZoneId.of("Asia/Ho_Chi_Minh");
                LocalDate today = LocalDate.now(zone);
                LocalDate startDateLocal = null;
                LocalDate endDateLocal = null;
                switch (rangeKey.toLowerCase()) {
                    case "today":
                        startDateLocal = today;
                        endDateLocal = today;
                        break;
                    case "last7days":
                        startDateLocal = today.minusDays(6);
                        endDateLocal = today;
                        break;
                    case "thisweek": {
                        // Tuần tính từ Thứ 2 đến Chủ nhật
                        int dayOfWeek = today.getDayOfWeek().getValue(); // Mon=1..Sun=7
                        startDateLocal = today.minusDays(dayOfWeek - 1);
                        endDateLocal = startDateLocal.plusDays(6);
                        break;
                    }
                    case "lastweek": {
                        // Tuần trước: Thứ 2..CN của tuần liền kề trước
                        int dayOfWeek = today.getDayOfWeek().getValue();
                        LocalDate thisWeekStart = today.minusDays(dayOfWeek - 1);
                        startDateLocal = thisWeekStart.minusDays(7);
                        endDateLocal = startDateLocal.plusDays(6);
                        break;
                    }
                    case "thismonth": {
                        startDateLocal = today.withDayOfMonth(1);
                        endDateLocal = today.withDayOfMonth(today.lengthOfMonth());
                        break;
                    }
                    case "lastmonth": {
                        LocalDate lastMonth = today.minusMonths(1);
                        startDateLocal = lastMonth.withDayOfMonth(1);
                        endDateLocal = lastMonth.withDayOfMonth(lastMonth.lengthOfMonth());
                        break;
                    }
                    case "thisyear": {
                        startDateLocal = today.withDayOfYear(1);
                        endDateLocal = today.withDayOfYear(today.lengthOfYear());
                        break;
                    }
                    case "lastyear": {
                        LocalDate lastYear = today.minusYears(1);
                        startDateLocal = lastYear.withDayOfYear(1);
                        endDateLocal = lastYear.withDayOfYear(lastYear.lengthOfYear());
                        break;
                    }
                    default:
                        startDateLocal = null;
                        endDateLocal = null;
                }
                if (startDateLocal != null && endDateLocal != null) {
                    startDate = LocalDateTime.of(startDateLocal, LocalTime.MIN);
                    endDate = LocalDateTime.of(endDateLocal, LocalTime.MAX);
                }
            }
            
            // Lấy danh sách severity được phép hiển thị từ database
            java.util.List<String> visibleSeverities = syslogSettingService.getVisibleSeverities();
            
            // Tối ưu: Chỉ COUNT những severity được phép hiển thị ngay từ database
            // Điều này giảm tải đáng kể khi có hàng triệu records của Debug/Info
            Map<String, Long> filteredCounts = ((com.foxconn.sopchecklist.service.serviceImpl.SysLogServiceImpl) service).getCountsBySeverity(
                search != null && !search.isBlank() ? search.trim() : null,
                factoryName != null && !factoryName.isBlank() ? factoryName.trim() : null,
                deviceId,
                status,
                startDate,
                endDate,
                visibleSeverities
            );
            
            // Đảm bảo tất cả visibleSeverities đều có trong response (kể cả count = 0)
            for (String sev : visibleSeverities) {
                if (!filteredCounts.containsKey(sev)) {
                    filteredCounts.put(sev, 0L);
                }
            }
            
            // Trả về cả danh sách visibleSeverities và counts đã filter
            Map<String, Object> response = new HashMap<>();
            response.put("visibleSeverities", visibleSeverities);
            response.put("counts", filteredCounts);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Error in getCountsBySeverity: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("visibleSeverities", java.util.Arrays.asList("Emergency", "Alert", "Critical", "Error", "Warning", "Notice", "Info", "Debug"));
            errorResponse.put("counts", new HashMap<>());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<SysLogDTO> findOne(@PathVariable Long id) {
        SysLogDTO dto = ((com.foxconn.sopchecklist.service.serviceImpl.SysLogServiceImpl) service).findByIdAsDTO(id);
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(dto);
    }

    @PostMapping
    public ResponseEntity<java.util.Map<String, Object>> create(@RequestBody java.util.Map<String, Object> body) {
        SysLog entity = new SysLog();
        entity.setId(null);
        entity.setSeverity((String) body.get("severity"));
        entity.setHostname((String) body.get("hostname"));
        entity.setLogText((String) body.get("logText"));
        entity.setFactoryId(body.get("factoryId") instanceof Number ? ((Number) body.get("factoryId")).intValue() : null);
        entity.setUserId(body.get("userId") instanceof Number ? ((Number) body.get("userId")).intValue() : null);
        entity.setCreatedDate(timeService.nowVietnam());
        entity.setStatus(0);
        entity.setMailSent(Boolean.FALSE);
        
        SysLog saved = service.save(entity);
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("id", saved.getId());
        response.put("success", true);
        return ResponseEntity.ok(response);
    }

    /**
     * Endpoint test để gửi email cho một syslog cụ thể
     */
    @PostMapping("/{id}/test-email")
    public ResponseEntity<Map<String, Object>> testEmail(@PathVariable Long id) {
        SysLog sysLog = service.findById(id);
        if (sysLog == null) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Syslog not found");
            return ResponseEntity.notFound().build();
        }
        
        try {
            mailSyslogService.sendSyslogNotification(sysLog, 1);
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "Email notification sent for syslog ID: " + id);
            result.put("severity", sysLog.getSeverity());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(error);
        }
    }

    @PatchMapping("/{id}")
    public ResponseEntity<java.util.Map<String, Object>> update(@PathVariable Long id, @RequestBody SysLogUpdateRequest request) {
        SysLog existing = service.findById(id);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }

        if (request.getFactoryId() != null) existing.setFactoryId(request.getFactoryId());
        if (request.getUserId() != null) existing.setUserId(request.getUserId());
        if (request.getSeverity() != null) existing.setSeverity(request.getSeverity());
        if (request.getHostname() != null) existing.setHostname(request.getHostname());
        if (request.getLogText() != null) existing.setLogText(request.getLogText());
        if (request.getCreatedDate() != null) existing.setCreatedDate(request.getCreatedDate());
        
        // Lưu trạng thái cũ trước khi cập nhật
        Integer oldStatus = existing.getStatus();
        
        if (request.getStatus() != null) existing.setStatus(request.getStatus());
        if (request.getActionTaken() != null) existing.setActionTaken(request.getActionTaken());
        
        // Handle completedAt: tự động set khi status = 2 (Hoàn thành)
        Integer newStatus = existing.getStatus();
        if (newStatus != null && newStatus == 2) {
            // Nếu status = 2 (Hoàn thành)
            if (request.getCompletedAt() != null) {
                // Nếu request có gửi completedAt, dùng giá trị đó
                existing.setCompletedAt(request.getCompletedAt());
            } else if (existing.getCompletedAt() == null) {
                // Nếu completedAt chưa có, tự động set = thời gian hiện tại
                existing.setCompletedAt(timeService.nowVietnam());
            }
            // Nếu completedAt đã có và request không gửi, giữ nguyên
        } else {
            // Nếu status không phải 2 (Hoàn thành)
            // Nếu trạng thái cũ là 2 (Hoàn thành) và trạng thái mới không phải 2, xóa completedAt
            if (oldStatus != null && oldStatus == 2 && newStatus != null && newStatus != 2) {
                existing.setCompletedAt(null);
            } else if (request.getCompletedAt() != null) {
                // Nếu request có gửi completedAt, dùng giá trị đó (có thể là null để xóa)
                existing.setCompletedAt(request.getCompletedAt());
            }
            // Nếu request không gửi completedAt và không phải trường hợp chuyển từ 2 sang khác, giữ nguyên giá trị hiện tại
        }
        
        if (request.getCollaborator() != null) existing.setCollaborator(request.getCollaborator());

        // Set last edited information
        existing.setLastEditedAt(timeService.nowVietnam());
        if (request.getLastEditedBy() != null) {
            existing.setLastEditedBy(request.getLastEditedBy());
        }

        // Handle files
        if (request.getFiles() != null) {
            // Clear existing files
            if (existing.getFiles() != null) {
                existing.getFiles().clear();
            } else {
                existing.setFiles(new ArrayList<>());
            }

            // Add new files
            LocalDateTime now = timeService.nowVietnam();
            for (SyslogFileDTO fileDTO : request.getFiles()) {
                SyslogFile file = new SyslogFile();
                if (fileDTO.getId() != null) {
                    // Existing file - keep ID and other fields
                    file.setId(fileDTO.getId());
                }
                file.setSyslog(existing);
                file.setFilePath(fileDTO.getFilePath());
                file.setFileName(fileDTO.getFileName());
                file.setFileType(fileDTO.getFileType());
                file.setFileSize(fileDTO.getFileSize());
                if (fileDTO.getCreatedAt() != null) {
                    file.setCreatedAt(fileDTO.getCreatedAt());
                } else {
                    file.setCreatedAt(now);
                }
                existing.getFiles().add(file);
            }
        }

        SysLog saved = service.update(existing);
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("id", saved.getId());
        result.put("success", true);
        return ResponseEntity.ok(result);
    }

    // Inner class for request body
    public static class SysLogUpdateRequest {
        private Integer factoryId;
        private Integer userId;
        private String severity;
        private String hostname;
        private String logText;
        private LocalDateTime createdDate;
        private Integer status;
        private String actionTaken;
        private LocalDateTime completedAt;
        private String collaborator;
        private Long lastEditedBy;
        private List<SyslogFileDTO> files;

        // Getters and setters
        public Integer getFactoryId() { return factoryId; }
        public void setFactoryId(Integer factoryId) { this.factoryId = factoryId; }
        public Integer getUserId() { return userId; }
        public void setUserId(Integer userId) { this.userId = userId; }
        public String getSeverity() { return severity; }
        public void setSeverity(String severity) { this.severity = severity; }
        public String getHostname() { return hostname; }
        public void setHostname(String hostname) { this.hostname = hostname; }
        public String getLogText() { return logText; }
        public void setLogText(String logText) { this.logText = logText; }
        public LocalDateTime getCreatedDate() { return createdDate; }
        public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }
        public Integer getStatus() { return status; }
        public void setStatus(Integer status) { this.status = status; }
        public String getActionTaken() { return actionTaken; }
        public void setActionTaken(String actionTaken) { this.actionTaken = actionTaken; }
        public LocalDateTime getCompletedAt() { return completedAt; }
        public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
        public String getCollaborator() { return collaborator; }
        public void setCollaborator(String collaborator) { this.collaborator = collaborator; }
        public Long getLastEditedBy() { return lastEditedBy; }
        public void setLastEditedBy(Long lastEditedBy) { this.lastEditedBy = lastEditedBy; }
        public List<SyslogFileDTO> getFiles() { return files; }
        public void setFiles(List<SyslogFileDTO> files) { this.files = files; }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        SysLog existing = service.findById(id);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/batch-update")
    public ResponseEntity<Map<String, Object>> batchUpdate(
            @RequestParam(value = "severity", required = false) String severity,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "factoryName", required = false) String factoryName,
            @RequestParam(value = "deviceId", required = false) Integer deviceId,
            @RequestParam(value = "status", required = false) Integer status,
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestBody BatchUpdateRequest request) {
        
        try {
            // Kiểm tra severity có trong danh sách được phép hiển thị không
            if (severity != null && !severity.isBlank()) {
                java.util.List<String> visibleSeverities = syslogSettingService.getVisibleSeverities();
                if (!visibleSeverities.contains(severity.trim())) {
                    Map<String, Object> error = new HashMap<>();
                    error.put("error", "Severity not allowed");
                    error.put("updatedCount", 0);
                    return ResponseEntity.badRequest().body(error);
                }
            }
            
            int updatedCount = service.updateBatchByFilters(
                severity != null && !severity.isBlank() ? severity.trim() : null,
                search != null && !search.isBlank() ? search.trim() : null,
                deviceId,
                factoryName != null && !factoryName.isBlank() ? factoryName.trim() : null,
                status,
                startDate,
                endDate,
                request.getStatus(),
                request.getActionTaken()
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("updatedCount", updatedCount);
            response.put("message", "Updated " + updatedCount + " syslog(s)");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Error in batchUpdate: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            error.put("updatedCount", 0);
            return ResponseEntity.status(500).body(error);
        }
    }

    // Inner class for batch update request body
    public static class BatchUpdateRequest {
        private Integer status;
        private String actionTaken;

        public Integer getStatus() {
            return status;
        }

        public void setStatus(Integer status) {
            this.status = status;
        }

        public String getActionTaken() {
            return actionTaken;
        }

        public void setActionTaken(String actionTaken) {
            this.actionTaken = actionTaken;
        }
    }
}


