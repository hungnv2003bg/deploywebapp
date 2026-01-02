package com.foxconn.sopchecklist.controller;

import com.foxconn.sopchecklist.entity.MailRecipientAll;
import com.foxconn.sopchecklist.service.MailRecipientAllService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mail-recipients-syslog")
@CrossOrigin
public class MailRecipientSyslogController {

    private final MailRecipientAllService service;

    public MailRecipientSyslogController(MailRecipientAllService service) {
        this.service = service;
    }

    @GetMapping("/{severity}")
    public List<MailRecipientAll> getSyslogRecipients(@PathVariable String severity) {
        try {
            List<MailRecipientAll> result = service.findByTypeMailRecipientTypeNameAndEnabledTrue(severity);
            return result;
        } catch (Exception e) {
            System.err.println("ERROR in getSyslogRecipients: " + e.getMessage());
            e.printStackTrace();
            return java.util.Collections.emptyList();
        }
    }

    @PostMapping("/{severity}/replace")
    public void replaceSyslogRecipients(@PathVariable String severity,
                                        @RequestParam(value = "to", required = false) String to,
                                        @RequestParam(value = "cc", required = false) String cc,
                                        @RequestParam(value = "bcc", required = false) String bcc) {
        service.replaceAllByEventType(severity, to, cc, bcc);
    }

    @PostMapping("/{severity}")
    public MailRecipientAll add(@PathVariable String severity, @RequestBody MailRecipientAll r) {
        return service.add(r);
    }

    @PutMapping("/{severity}/{id}")
    public MailRecipientAll update(@PathVariable String severity, @PathVariable Long id, @RequestBody MailRecipientAll r) {
        return service.update(id, r);
    }

    @DeleteMapping("/{severity}/{id}")
    public void delete(@PathVariable String severity, @PathVariable Long id) {
        service.delete(id);
    }
}

