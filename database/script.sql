CREATE TABLE `users` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`names` VARCHAR(50) NOT NULL COLLATE 'latin1_swedish_ci',
	`last_names` VARCHAR(50) NOT NULL COLLATE 'latin1_swedish_ci',
	`password` VARCHAR(50) NOT NULL COLLATE 'latin1_swedish_ci',
	`username` VARCHAR(50) NOT NULL COLLATE 'latin1_swedish_ci',
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `username` (`username`) USING BTREE
);

CREATE TABLE `movimientos_detectados` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`clase` VARCHAR(150) NULL DEFAULT NULL COLLATE 'latin1_swedish_ci',
	`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `clase` (`clase`) USING BTREE
);
CREATE TABLE detecciones (
    id SERIAL PRIMARY KEY,
    modelo VARCHAR(255),
    clase VARCHAR(255),
    x1 INT,
    y1 INT,
    x2 INT,
    y2 INT,
    confianza FLOAT
);

insert into users (names,last_names,password,username) values('sergio','guzman','123456789','guzmanfernandezsergio@gmail.com')