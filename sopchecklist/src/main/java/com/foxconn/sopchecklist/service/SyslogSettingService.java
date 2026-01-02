package com.foxconn.sopchecklist.service;

import com.foxconn.sopchecklist.entity.SyslogSetting;
import com.foxconn.sopchecklist.repository.SyslogSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class SyslogSettingService {

    private static final List<String> DEFAULT_SEVERITIES = Arrays.asList(
            "Emergency",
            "Alert",
            "Critical",
            "Error",
            "Warning",
            "Notice",
            "Info",
            "Debug"
    );

    private final SyslogSettingRepository repository;

    public SyslogSettingService(SyslogSettingRepository repository) {
        this.repository = repository;
    }

    public List<String> getVisibleSeverities() {
        Optional<SyslogSetting> settingOpt = repository.findAll().stream().findFirst();
        if (settingOpt.isEmpty() || settingOpt.get().getVisibleSeveritiesJson() == null) {
            return DEFAULT_SEVERITIES;
        }
        try {
            String json = settingOpt.get().getVisibleSeveritiesJson();
            return Arrays.stream(json.replace("[", "")
                    .replace("]", "")
                    .replace("\"", "")
                    .split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());
        } catch (Exception e) {
            return DEFAULT_SEVERITIES;
        }
    }

    public SyslogSetting saveVisibleSeverities(List<String> severities, Long updatedBy) {
        List<String> sanitized = (severities == null || severities.isEmpty())
                ? DEFAULT_SEVERITIES
                : severities.stream()
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());

        if (sanitized.isEmpty()) {
            sanitized = DEFAULT_SEVERITIES;
        }

        String json = sanitized.stream()
                .map(s -> "\"" + s + "\"")
                .collect(Collectors.joining(",", "[", "]"));

        SyslogSetting setting = repository.findAll().stream().findFirst().orElse(new SyslogSetting());
        setting.setVisibleSeveritiesJson(json);
        setting.setUpdatedBy(updatedBy);
        return repository.save(setting);
    }
}

