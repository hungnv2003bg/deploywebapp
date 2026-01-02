package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.StatisticsSysLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Repository cho StatisticsSysLog
 * Hỗ trợ aggregate statistics theo severity và area
 */
@Repository
public interface StatisticsSysLogRepository extends JpaRepository<StatisticsSysLog, Long> {

    /**
     * Count syslogs by severity cho một area cụ thể hoặc tất cả areas
     */
    @Query(value = """
            SELECT COUNT(*) FROM statistics_syslogs 
            WHERE (:severity IS NULL OR severity = :severity)
              AND (:area IS NULL OR :area = 'ALL' OR area = :area)
              AND (:fromDate IS NULL OR created_date >= :fromDate)
              AND (:toDate IS NULL OR created_date <= :toDate)
            """, nativeQuery = true)
    long countBySeverity(
            @Param("severity") String severity,
            @Param("area") String area,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate
    );

    /**
     * Count syslogs by severity, grouped by area
     * Trả về Map<area, count>
     */
    @Query(value = """
            SELECT area, COUNT(*) as count
            FROM statistics_syslogs 
            WHERE (:severity IS NULL OR severity = :severity)
              AND (:fromDate IS NULL OR created_date >= :fromDate)
              AND (:toDate IS NULL OR created_date <= :toDate)
            GROUP BY area
            """, nativeQuery = true)
    List<Object[]> countBySeverityGroupByArea(
            @Param("severity") String severity,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate
    );

    /**
     * Get distinct areas
     */
    @Query("SELECT DISTINCT s.area FROM StatisticsSysLog s ORDER BY s.area")
    List<String> findDistinctAreas();
}
