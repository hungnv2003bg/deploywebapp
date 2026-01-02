package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.AttendanceReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceReportRepository extends JpaRepository<AttendanceReport, Long> {
    
    Optional<AttendanceReport> findByUser_UserIDAndAttendanceDate(Integer userId, LocalDate date);
    
    List<AttendanceReport> findByUser_UserIDOrderByAttendanceDateDesc(Integer userId);
    
    List<AttendanceReport> findByAttendanceDateBetween(LocalDate startDate, LocalDate endDate);
    
    List<AttendanceReport> findByUser_UserIDAndAttendanceDateBetween(
            Integer userId, LocalDate startDate, LocalDate endDate);
    
    List<AttendanceReport> findByAttendanceDate(LocalDate date);
    
    List<AttendanceReport> findByStatusAndAttendanceDate(String status, LocalDate date);

    List<AttendanceReport> findByUser_UserIDInAndAttendanceDateBetween(
            List<Integer> userIds, LocalDate startDate, LocalDate endDate);
}


