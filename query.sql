-- GET project name and userid and fullname
SELECT DISTINCT projects.name, members.userid, concat(users.firstname ,' ', users.lastname) as fullname FROM members JOIN projects ON projects.projectid = members.projectid
JOIN users ON users.userid = members.userid WHERE members.projectid = 6;

-- GET project name and project id and fullname
SELECT DISTINCT projects.name, members.projectid, concat(users.firstname ,' ', users.lastname) as fullname FROM members JOIN projects ON projects.projectid = members.projectid
JOIN users ON users.userid = members.userid WHERE members.projectid = 6;

-- get all data project(projectid , project name , and all name members in one row)
SELECT DISTINCT members.projectid, max(projects.name) as name, string_agg(users.firstname || ' ' || users.lastname, ', ') as allname FROM members JOIN projects ON projects.projectid = members.projectid
JOIN users ON users.userid = members.userid GROUP BY members.projectid;

-- GET allname in members DISTINCT
SELECT DISTINCT concat(users.firstname || ' ' || users.lastname)as fullname from members join users on users.userid = members.userid;

-- GET total member in project
select count(data) as total from  (select members.userid, members.role, CONCAT(users.firstname,' ', users.lastname) AS fullname from members 
INNER JOIN users ON members.userid = users.userid where members.projectid = 6)as data;

-- dapet date
select *, CASE WHEN date(time) = CURRENT_DATE THEN 'Today' ELSE to_char(time, 'Day') END as day  from activity where date(time) = CURRENT_DATE ORDER BY time desc;