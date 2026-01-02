package com.foxconn.sopchecklist.repository;

import com.foxconn.sopchecklist.entity.SyslogDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SyslogDeviceRepository extends JpaRepository<SyslogDevice, Integer> {
}

