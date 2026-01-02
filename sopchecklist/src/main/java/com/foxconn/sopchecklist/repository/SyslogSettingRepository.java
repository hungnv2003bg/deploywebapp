package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.SyslogSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SyslogSettingRepository extends JpaRepository<SyslogSetting, Long> {
}

