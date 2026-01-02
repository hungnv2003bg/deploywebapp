package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.OvertimeConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OvertimeConfigRepository extends JpaRepository<OvertimeConfig, Integer> {
    Optional<OvertimeConfig> findByYearAndMonth(Integer year, Integer month);
    Optional<OvertimeConfig> findByYearAndMonthAndUserId(Integer year, Integer month, Integer userId);
}
