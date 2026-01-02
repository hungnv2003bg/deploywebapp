package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.BannerEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BannerEventRepository extends JpaRepository<BannerEvent, Long> {

    @Query("SELECT b FROM BannerEvent b WHERE b.status = true AND :today BETWEEN b.startDate AND b.endDate")
    List<BannerEvent> findActiveOn(@Param("today") LocalDate today);
}
