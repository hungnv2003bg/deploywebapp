package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.PersonalNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PersonalNoteRepository extends JpaRepository<PersonalNote, Long> {
    
    // Tìm ghi chú theo user ID
    List<PersonalNote> findByUser_UserIDOrderByNoteDateDesc(Integer userId);
    
    // Tìm ghi chú theo user ID và ngày
    Optional<PersonalNote> findByUser_UserIDAndNoteDate(Integer userId, LocalDate noteDate);
    
    // Tìm tất cả ghi chú của một user trong khoảng thời gian
    List<PersonalNote> findByUser_UserIDAndNoteDateBetween(
            Integer userId, LocalDate startDate, LocalDate endDate);
    
    // Tìm ghi chú theo ngày (tất cả users - có thể dùng cho admin)
    List<PersonalNote> findByNoteDate(LocalDate noteDate);
    
    // Xóa tất cả ghi chú của một user
    void deleteByUser_UserID(Integer userId);
    
    // Đếm số lượng ghi chú của một user trong một tháng/năm
    @Query("SELECT COUNT(pn) FROM PersonalNote pn WHERE pn.user.userID = :userId " +
           "AND YEAR(pn.noteDate) = :year AND MONTH(pn.noteDate) = :month")
    Long countByUserIdAndYearAndMonth(@Param("userId") Integer userId, @Param("year") Integer year, @Param("month") Integer month);
    
    // Lấy số lượng ghi chú theo từng tháng trong năm
    @Query("SELECT MONTH(pn.noteDate) as month, COUNT(pn) as count " +
           "FROM PersonalNote pn WHERE pn.user.userID = :userId " +
           "AND YEAR(pn.noteDate) = :year " +
           "GROUP BY MONTH(pn.noteDate)")
    List<Object[]> countByUserIdAndYearGroupByMonth(@Param("userId") Integer userId, @Param("year") Integer year);

    /**
     * Lấy tất cả ghi chú của user từ ngày hiện tại trở đi, sắp xếp theo ngày tăng dần
     */
    @Query("SELECT pn FROM PersonalNote pn JOIN FETCH pn.user WHERE pn.user.userID = :userId " +
           "AND pn.noteDate >= :fromDate " +
           "ORDER BY pn.noteDate ASC")
    List<PersonalNote> findByUserIdAndNoteDateGreaterThanEqualOrderByNoteDateAsc(
            @Param("userId") Integer userId, 
            @Param("fromDate") java.time.LocalDate fromDate);

    List<PersonalNote> findByNoteDateAndPublicVisibleTrue(LocalDate noteDate);

    List<PersonalNote> findByPublicVisibleTrueAndNoteDateBetween(LocalDate startDate, LocalDate endDate);
}

