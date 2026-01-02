package com.foxconn.sopchecklist.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.persistence.*;

@Entity
@Table(name = "syslog_device")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class SyslogDevice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "device_name", columnDefinition = "NVARCHAR(200)")
    private String deviceName;
}

