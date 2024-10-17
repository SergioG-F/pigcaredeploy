import pymysql.cursors

#Nubeee
def get_db_connection():
    return pymysql.connect(
        host="bzibxvlhi8vtirvd5dfe-mysql.services.clever-cloud.com",
        user="urkzhizvqyl4nofz",
        password="6ayQNba2abwljQZdRNBu",
        database="bzibxvlhi8vtirvd5dfe",
        port=3306,
        cursorclass=pymysql.cursors.DictCursor

    )

#def get_db_connection():
#    return pymysql.connect(
#        host="localhost",
#        user="root",
#        password="root",
#        database="object_detection_db",
#        cursorclass=pymysql.cursors.DictCursor
#    )