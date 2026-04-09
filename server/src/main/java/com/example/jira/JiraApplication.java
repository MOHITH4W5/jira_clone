package com.example.jira;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.data.mongodb.autoconfigure.DataMongoAutoConfiguration;
import org.springframework.boot.mongodb.autoconfigure.MongoAutoConfiguration;

@SpringBootApplication(exclude = {
		MongoAutoConfiguration.class,
		DataMongoAutoConfiguration.class
})
public class JiraApplication {

	public static void main(String[] args) {
		SpringApplication.run(JiraApplication.class, args);
	}

}
