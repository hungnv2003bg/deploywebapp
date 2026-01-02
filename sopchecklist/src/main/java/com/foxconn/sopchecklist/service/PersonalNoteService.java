package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.PersonalNote;
import com.foxconn.sopchecklist.entity.Users;
import com.foxconn.sopchecklist.repository.PersonalNoteRepository;
import com.foxconn.sopchecklist.repository.UsersRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class PersonalNoteService {

    private final PersonalNoteRepository repository;
    private final UsersRepository usersRepository;

    public PersonalNoteService(PersonalNoteRepository repository, UsersRepository usersRepository) {
        this.repository = repository;
        this.usersRepository = usersRepository;
    }

    /**
     * Lấy tất cả ghi chú của một user
     */
    public List<PersonalNote> findByUserId(Integer userId) {
        return repository.findByUser_UserIDOrderByNoteDateDesc(userId);
    }

    /**
     * Lấy ghi chú theo user ID và ngày
     */
    public Optional<PersonalNote> findByUserIdAndDate(Integer userId, LocalDate noteDate) {
        return repository.findByUser_UserIDAndNoteDate(userId, noteDate);
    }

    /**
     * Lấy ghi chú của một user trong khoảng thời gian
     */
    public List<PersonalNote> findByUserIdAndDateRange(Integer userId, LocalDate startDate, LocalDate endDate) {
        return repository.findByUser_UserIDAndNoteDateBetween(userId, startDate, endDate);
    }

    /**
     * Lấy ghi chú theo ID
     */
    public PersonalNote findById(Long id) {
        return repository.findById(id).orElse(null);
    }

    /**
     * Tạo hoặc cập nhật ghi chú
     * Nếu đã tồn tại ghi chú cho ngày đó, sẽ cập nhật nội dung
     * Nếu content rỗng và đã có note, sẽ xóa note đó
     */
    @Transactional
    public PersonalNote saveOrUpdate(Integer userId, LocalDate noteDate, String content, Boolean publicVisible) {
        Users user = usersRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy user với ID: " + userId));

        Optional<PersonalNote> existingNote = repository.findByUser_UserIDAndNoteDate(userId, noteDate);
        
        String trimmedContent = content != null ? content.trim() : "";
        
        // Nếu content rỗng và đã có note, xóa note đó
        if (trimmedContent.isEmpty() && existingNote.isPresent()) {
            repository.delete(existingNote.get());
            return null; // Trả về null để controller biết đã xóa
        }
        
        // Nếu content rỗng và chưa có note, không làm gì (trả về null nhưng không phải xóa)
        if (trimmedContent.isEmpty()) {
            return null; // Trả về null để controller biết không tạo mới
        }
        
        if (existingNote.isPresent()) {
            PersonalNote note = existingNote.get();
            note.setContent(trimmedContent);
            note.setUpdatedAt(LocalDateTime.now());
            note.setPublicVisible(Boolean.TRUE.equals(publicVisible));
            return repository.save(note);
        } else {
            PersonalNote note = new PersonalNote();
            note.setUser(user);
            note.setNoteDate(noteDate);
            note.setContent(trimmedContent);
            note.setCreatedAt(LocalDateTime.now());
            note.setPublicVisible(Boolean.TRUE.equals(publicVisible));
            return repository.save(note);
        }
    }

    /**
     * Xóa ghi chú theo ID
     */
    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Không tìm thấy ghi chú với ID: " + id);
        }
        repository.deleteById(id);
    }

    /**
     * Xóa ghi chú theo user ID và ngày
     */
    @Transactional
    public void deleteByUserIdAndDate(Integer userId, LocalDate noteDate) {
        Optional<PersonalNote> note = repository.findByUser_UserIDAndNoteDate(userId, noteDate);
        if (note.isPresent()) {
            repository.delete(note.get());
        }
    }

    /**
     * Đếm số lượng ghi chú của một user trong một tháng/năm
     */
    public Long countByUserIdAndYearAndMonth(Integer userId, Integer year, Integer month) {
        Long count = repository.countByUserIdAndYearAndMonth(userId, year, month);
        return count != null ? count : 0L;
    }

    /**
     * Lấy số lượng ghi chú theo từng tháng trong năm
     * Trả về Map với key là tháng (1-12), value là số lượng ghi chú
     */
    public java.util.Map<Integer, Long> getNotesCountByMonthForYear(Integer userId, Integer year) {
        List<Object[]> results = repository.countByUserIdAndYearGroupByMonth(userId, year);
        java.util.Map<Integer, Long> monthCounts = new java.util.HashMap<>();
        
        // Khởi tạo tất cả các tháng với 0
        for (int i = 1; i <= 12; i++) {
            monthCounts.put(i, 0L);
        }
        
        // Cập nhật số lượng từ kết quả query
        for (Object[] result : results) {
            Integer month = ((Number) result[0]).intValue();
            Long count = ((Number) result[1]).longValue();
            monthCounts.put(month, count);
        }
        
        return monthCounts;
    }

    /**
     * Lấy tất cả ghi chú của user từ ngày hiện tại trở đi (tương lai)
     * Sắp xếp theo ngày tăng dần
     */
    public List<PersonalNote> findFutureNotesByUserId(Integer userId) {
        LocalDate today = LocalDate.now();
        return repository.findByUserIdAndNoteDateGreaterThanEqualOrderByNoteDateAsc(userId, today);
    }

    public List<PersonalNote> findPublicNotesByDate(LocalDate date) {
        return repository.findByNoteDateAndPublicVisibleTrue(date);
    }

    public List<PersonalNote> findPublicNotesByDateRange(LocalDate startDate, LocalDate endDate) {
        return repository.findByPublicVisibleTrueAndNoteDateBetween(startDate, endDate);
    }
}

