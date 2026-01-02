package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.UserAttendance;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.repository.UserAttendanceRepository;
import com.foxconn.sopchecklist.repository.UsersRepository;
import com.foxconn.sopchecklist.service.UsersService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class UserAttendanceService {

    private final UserAttendanceRepository repository;
    private final UsersRepository usersRepository;
    
    @Autowired(required = false)
    private AttendanceReportService attendanceReportService;
    
    @Autowired(required = false)
    private TimeService timeService;
    
    @Autowired(required = false)
    private UsersService usersService;

    public UserAttendanceService(UserAttendanceRepository repository, UsersRepository usersRepository) {
        this.repository = repository;
        this.usersRepository = usersRepository;
    }

    public List<UserAttendance> findAll() {
        return repository.findAllOrderedByIsActiveAndCreatedAt();
    }

    public List<UserAttendance> findActiveUsers() {
        return repository.findByIsActiveTrue();
    }

    public UserAttendance findById(Long id) {
        return repository.findById(id).orElse(null);
    }

    public Optional<UserAttendance> findByUserId(Integer userId) {
        return repository.findByUser_UserID(userId);
    }

    public Page<UserAttendance> findActiveWithFilters(String search, Long groupId, int page, int size) {
        String normalizedSearch = (search != null && !search.isBlank()) ? search.trim().toLowerCase() : null;
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1));

        List<UserAttendance> baseList = repository.findByIsActiveTrue();
        
        
        Integer currentUserId = null;
        if (usersService != null) {
            Users currentUser = usersService.getCurrentAuthenticatedUser();
            if (currentUser != null && currentUser.getUserID() != null) {
                currentUserId = currentUser.getUserID();
            }
        }

        final Integer finalCurrentUserId = currentUserId;
        List<UserAttendance> filtered = baseList.stream()
                .filter(ua -> {
                    if (groupId == null) return true;
                    Users u = ua.getUser();
                    if (u == null || u.getGroups() == null) return false;
                    return u.getGroups().stream().anyMatch(g -> g != null && g.getId() != null && g.getId().equals(groupId));
                })
                .filter(ua -> {
                    if (normalizedSearch == null) return true;
                    Users u = ua.getUser();
                    if (u == null) return false;
                    String fullName = u.getFullName() != null ? u.getFullName().toLowerCase() : "";
                    String manv = u.getManv() != null ? u.getManv().toLowerCase() : "";
                    return fullName.contains(normalizedSearch) || manv.contains(normalizedSearch);
                })
                .sorted((a, b) -> {
                    // Ưu tiên user đăng nhập hiện tại lên đầu
                    if (finalCurrentUserId != null) {
                        Integer userIdA = a.getUser() != null ? a.getUser().getUserID() : null;
                        Integer userIdB = b.getUser() != null ? b.getUser().getUserID() : null;
                        
                        boolean aIsCurrent = finalCurrentUserId.equals(userIdA);
                        boolean bIsCurrent = finalCurrentUserId.equals(userIdB);
                        
                        if (aIsCurrent && !bIsCurrent) return -1;
                        if (!aIsCurrent && bIsCurrent) return 1;
                    }
                    
                    // Sau đó sắp xếp theo ID
                    Long id1 = a.getId() != null ? a.getId() : Long.MAX_VALUE;
                    Long id2 = b.getId() != null ? b.getId() : Long.MAX_VALUE;
                    return id1.compareTo(id2);
                })
                .toList();

        int fromIndex = (int) pageable.getOffset();
        int toIndex = Math.min(fromIndex + pageable.getPageSize(), filtered.size());
        List<UserAttendance> pageContent = fromIndex >= filtered.size()
                ? java.util.Collections.emptyList()
                : filtered.subList(fromIndex, toIndex);

        return new PageImpl<>(pageContent, pageable, filtered.size());
    }

    /**
     * Normalize shift value to ensure it's always "Ngày" or "Đêm" with proper Vietnamese characters
     */
    private String normalizeShift(String shift) {
        if (shift == null || shift.trim().isEmpty()) {
            return "Ngày";
        }
        String normalized = shift.trim();
        // Handle various possible inputs for night shift
        String lowerNormalized = normalized.toLowerCase();
        if (lowerNormalized.equals("đêm") || lowerNormalized.equals("dem") || 
            lowerNormalized.contains("đêm") || lowerNormalized.equals("night")) {
            return "Đêm";
        }
        // Default to "Ngày" for any other value (including "Ngày", "Ngay", "day", etc.)
        return "Ngày";
    }

    @Transactional
    public UserAttendance create(Integer userId, String shift) {
        Users user = usersRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy user với ID: " + userId));

        // Kiểm tra xem đã tồn tại chưa
        Optional<UserAttendance> existing = repository.findByUser_UserID(userId);
        if (existing.isPresent()) {
            throw new IllegalArgumentException("User này đã được thêm vào danh sách theo dõi điểm danh");
        }

        UserAttendance userAttendance = new UserAttendance();
        userAttendance.setUser(user);
        userAttendance.setIsActive(true);
        String finalShift = normalizeShift(shift);
        userAttendance.setShift(finalShift);
        userAttendance.setCreatedAt(LocalDateTime.now());

        UserAttendance saved = repository.save(userAttendance);

        // Tự động tạo điểm danh cho 7 ngày gần nhất khi thêm user mới vào tracking list
        if (attendanceReportService != null) {
            try {
                attendanceReportService.createAttendanceForNext7Days(userId, finalShift);
            } catch (Exception e) {
                // Log lỗi nhưng không throw để không ảnh hưởng đến việc tạo UserAttendance
                // Lỗi này sẽ được scheduler tự động xử lý trong lần chạy tiếp theo
            }
        }

        return saved;
    }

    @Transactional
    public UserAttendance update(Long id, Boolean isActive, String shift) {
        UserAttendance userAttendance = repository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bản ghi với ID: " + id));

        Boolean oldIsActive = userAttendance.getIsActive();
        String oldShift = userAttendance.getShift();
        
        if (shift != null) {
            String normalizedShift = normalizeShift(shift);
            userAttendance.setShift(normalizedShift);
            shift = normalizedShift; // Update shift variable for later use
        }
        
        if (isActive != null) {
            userAttendance.setIsActive(isActive);
            
            if (attendanceReportService != null) {
                Integer userId = userAttendance.getUser().getUserID();
                String currentShift = userAttendance.getShift() != null ? userAttendance.getShift() : "Ngày";
                
                // Lấy ngày hiện tại
                LocalDate today;
                if (timeService != null) {
                    today = timeService.nowVietnam().toLocalDate();
                } else {
                    today = LocalDate.now();
                }
                
                // Nếu chuyển từ true sang false (tắt theo dõi), xóa các bản ghi điểm danh từ hôm nay trở đi (7 ngày)
                if (oldIsActive != null && oldIsActive && !isActive) {
                    // Xóa từ ngày hiện tại đến 6 ngày sau
                    LocalDate startDate = today;
                    LocalDate endDate = today.plusDays(6);
                    
                    // Xóa các bản ghi điểm danh trong khoảng thời gian này
                    attendanceReportService.deleteByUserIdAndDateRange(userId, startDate, endDate);
                }
                // Nếu chuyển từ false sang true (bật lại theo dõi), tạo lại các bản ghi điểm danh trong tương lai (7 ngày)
                else if (oldIsActive != null && !oldIsActive && isActive) {
                    // Tạo lại điểm danh cho 7 ngày tiếp theo (từ hôm nay đến 6 ngày sau)
                    // Method này sẽ tự động skip những ngày đã tồn tại
                    attendanceReportService.createAttendanceForNext7Days(userId, currentShift);
                }
            }
        }
        
        // Nếu ca thay đổi và đang active, cần tạo lại điểm danh với ca mới
        if (shift != null && !shift.equals(oldShift) && userAttendance.getIsActive() && attendanceReportService != null) {
            Integer userId = userAttendance.getUser().getUserID();
            LocalDate today;
            if (timeService != null) {
                today = timeService.nowVietnam().toLocalDate();
            } else {
                today = LocalDate.now();
            }
            
            // Xóa các bản ghi cũ từ hôm nay đến 6 ngày sau
            LocalDate startDate = today;
            LocalDate endDate = today.plusDays(6);
            attendanceReportService.deleteByUserIdAndDateRange(userId, startDate, endDate);
            
            // Tạo lại với ca mới
            attendanceReportService.createAttendanceForNext7Days(userId, shift);
        }
        
        userAttendance.setUpdatedAt(LocalDateTime.now());

        return repository.save(userAttendance);
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Không tìm thấy bản ghi với ID: " + id);
        }
        repository.deleteById(id);
    }

    @Transactional
    public void deleteByUserId(Integer userId) {
        Optional<UserAttendance> userAttendance = repository.findByUser_UserID(userId);
        if (userAttendance.isPresent()) {
            repository.delete(userAttendance.get());
        }
    }
}

