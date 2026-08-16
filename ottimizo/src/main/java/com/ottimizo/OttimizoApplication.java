package com.ottimizo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@EnableJpaAuditing
@SpringBootApplication
public class OttimizoApplication {

    public static void main(String[] args) {
        SpringApplication.run(OttimizoApplication.class, args);
    }
}
