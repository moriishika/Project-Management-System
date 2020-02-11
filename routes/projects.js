const bodyParser = require('body-parser');
const express = require('express');
const router = express.Router();
const helpers = require('../helpers/util')
const moment = require('moment');


router.use(bodyParser.urlencoded({
    extended: false
}));
router.use(bodyParser.json());

module.exports = (pool) => {
    router.get('/', helpers.isLoggedIn, (req, res, next) => {
        let getData = `SELECT count(id) as total from (SELECT DISTINCT projects.projectid as id FROM projects LEfT JOIN members ON members.projectid = projects.projectid
        LEFT JOIN users ON users.userid = members.userid `
        let queries = [];
        const query = req.query;
        const currentPage = req.query.page || 1;
        const limit = 5;
        const offset = (currentPage - 1) * limit;
        const id = [req.session.user.userid]
        let url = req.originalUrl;
        if (!url.includes("page")) {
            url = url.includes("?") ?
                url.replace("?", `?page=${currentPage}&`) :
                `${url}?page=${currentPage}`;
        }

        if (query.cfid && query.id) {
            queries.push(`projects.projectid = ${query.id}`);
        }

        if (query.cfname && query.name) {
            queries.push(`projects.name ILIKE '%${query.name}%'`);
        }

        if (query.cfmember && query.member) {
            queries.push(`members.userid = ${query.member}`)
        }

        queries.push('users.isactive = true')
        if (queries.length > 0) {
            getData += ' WHERE ' + queries.join(' AND ')
        }
        getData += ') as total';

        console.log(getData)
        pool.query(getData, (err, totalData) => {
            if (err) throw err;
            const total = totalData.rows[0].total;
            const totalPages = Math.ceil(total / limit)
            getData = `SELECT DISTINCT projects.projectid, projects.name, string_agg(users.firstname || ' ' || users.lastname, ', ') as membersname FROM projects LEFT JOIN members ON members.projectid = projects.projectid
        LEFT JOIN users ON users.userid = members.userid  `


            if (queries.length > 0) {
                getData += ' WHERE ' + queries.join(' AND ')
            }

            getData += ` GROUP BY projects.projectid ORDER BY projectid ASC LIMIT ${limit} OFFSET ${offset}`;

            console.log(getData);
            pool.query(getData, (err, projectData) => {
                if (err) throw err;
                let getMembers = `SELECT userid, concat(firstname,' ',lastname) as fullname FROM users WHERE isactive = true`
                pool.query(getMembers, (err, members) => {
                    if (err) throw err
                    const getOptions = `SELECT projectopt from users where userid = $1`
                    pool.query(getOptions, id, (err, options) => {
                        if (err) throw err;
                        console.log(options.rows)
                        res.render('projects/dashboard', result = {
                            projects: projectData.rows,
                            members: members.rows,
                            query,
                            totalPages,
                            url,
                            currentPage,
                            options: options.rows[0].projectopt
                        });
                    })

                })
            })
        })
    });

    router.post('/', helpers.isLoggedIn, (req, res, next) => {
        const updateOptions = `UPDATE users SET projectopt = $1 WHERE userid = $2`;
        const data = [{
            ...req.body
        }, req.session.user.userid];
        pool.query(updateOptions, data, (err) => {
            if (err) throw err;
            res.redirect('/projects');
        })
    })

    router.get('/add', helpers.isLoggedIn, (req, res, next) => {
        let getMembers = `SELECT userid, concat(firstname,' ',lastname) as fullname FROM users WHERE isactive = true`
        pool.query(getMembers, (err, member) => {
            res.render('projects/add', result = {
                members: member.rows
            });
        })
    })

    router.post('/add', helpers.isLoggedIn, (req, res, next) => {
        let insertQuery = 'with new_project as ( INSERT INTO projects(name) VALUES($1) returning projectid ) INSERT INTO members(userid, projectid) VALUES ($2, (select projectid from new_project))';
        let body = [];
        if (req.body.members == undefined) {
            body = [req.body.name]
            insertQuery = `with new_project as ( INSERT INTO projects(name) VALUES($1) returning projectid ) INSERT INTO members(projectid) VALUES ((select projectid from new_project))`
        } else if (typeof req.body.members == 'string') {
            body = [req.body.name, req.body.members]
        } else if (typeof req.body.members == 'object') {
            let dataLength = req.body.members.length + 2;
            for (let i = 3; i < dataLength; i++) {
                insertQuery += `,($${i}, (select projectid from new_project))`;
                body = [req.body.name, ...req.body.members];
            }
        }
        pool.query(insertQuery, body, (err) => {
            if (err) return console.error(err);
            res.redirect('/projects/add');
        })
    })

    router.get('/edit/:id', helpers.isLoggedIn, (req, res, next) => {
        const getUser = `SELECT userid, concat(firstname,' ',lastname) as fullname FROM users WHERE isactive = true`
        const id = [req.params.id];
        pool.query(getUser, (err, users) => {
            const getDataProject = `SELECT DISTINCT projects.projectid, projects.name, members.userid, concat(users.firstname || ' ' || users.lastname) as fullname FROM projects LEFT JOIN members ON members.projectid = projects.projectid
        LEFT JOIN users ON users.userid = members.userid WHERE projects.projectid = $1;`
            pool.query(getDataProject, id, (err, result) => {
                if (err) throw err;
                res.render('projects/edit', result = {
                    projects: result.rows,
                    members: result.rows.map(member => member.userid),
                    users: users.rows

                })
            })
        })
    })

    router.post('/edit/:id', helpers.isLoggedIn, (req, res, err) => {
        let updateProject = 'UPDATE projects SET name = $1 WHERE projectid = $2'
        let body = [req.body.name, req.params.id];
        pool.query(updateProject, body, (err) => {
            if (err) throw err;
            let deleteProject = 'DELETE FROM members WHERE projectid = $1';
            const id = [req.params.id];
            pool.query(deleteProject, id, (err) => {
                if (err) throw err;
                let insertQuery = 'INSERT INTO members(projectid, userid) VALUES ($1, $2)';
                body = [];
                if (req.body.members == undefined) {
                    res.redirect(`/projects/edit/${id}`)
                } else if (typeof req.body.members == 'string') {
                    body = [req.params.id, req.body.members]
                } else if (typeof req.body.members == 'object') {
                    let dataLength = req.body.members.length + 1;
                    for (let i = 3; i <= dataLength; i++) {
                        insertQuery += `,($1, $${i})`;
                        body = [req.params.id, ...req.body.members];
                    }
                    console.log(body)
                    console.log(insertQuery);
                }
                pool.query(insertQuery, body, (err) => {
                    if (err) return console.error(err);
                    res.redirect(`/projects/edit/${req.params.id}`);
                })
            })
        });
    })

    router.get('/delete/:id', helpers.isLoggedIn, (req, res, next) => {
        let deleteProject = 'DELETE FROM members WHERE projectid = $1';
        const id = [req.params.id];
        pool.query(deleteProject, id, (err) => {
            if (err) throw err;
            deleteProject = 'DELETE FROM projects WHERE projectid = $1';
            pool.query(deleteProject, id, (err) => {
                if (err) throw err;
                res.redirect('/projects');
            })
        });
    })

    //OVERVIEW
    router.get('/overview/:id', helpers.isLoggedIn, (req, res, next) => {
        const projectid = req.params.id
        console.log(projectid)
        res.render('overview/overview', {
            projectid
        });
    })

    //ACTIVITY
    router.get('/activity/:id', helpers.isLoggedIn, (req, res, next) => {
        const projectid = req.params.id
        res.render('overview/activity', {
            projectid
        });
    })

    //MEMBERS
    router.get('/members/:id', helpers.isLoggedIn, (req, res, next) => {
        const projectid = [req.params.id]
        let url = req.originalUrl;
        const currentPage = req.query.page || 1;
        const limit = 5;
        const offset = (currentPage - 1) * limit
        const query = req.query;
        const queries = [];
        if (!url.includes('?page')) {
            url = url.includes('?') ? url.replace(`?page=${currentPage}&`) : url.replace(`${url}?page=${currentPage}`);
        }
        let totalData = `SELECT COUNT(member) as total  FROM (SELECT members.userid FROM members JOIN users ON members.userid = users.userid WHERE members.projectid = $1`

        if (query.cfid && query.id) {
            queries.push(`members.userid = ${query.id}`);
        }

        if (query.cfname && query.name) {
            queries.push(`CONCAT(users.firstname, ' ', users.lastname) ILIKE '%${query.name}%'`);
        }

        if (query.cfposition && query.position) {
            queries.push(`members.role = '${query.position}'`)
        }

        if (queries.length > 0) {
            totalData += ` AND ${queries.join(' AND ')}`
        }

        totalData += `) as member`;

        console.log(totalData);
        pool.query(totalData, projectid, (err, members) => {
            if (err) throw err;
            const total = members.rows[0].total;
            const totalPages = Math.ceil(total / limit);
            let getMembers = `select members.userid, members.role, CONCAT(users.firstname,' ', users.lastname) AS fullname from members 
            INNER JOIN users ON members.userid = users.userid WHERE members.projectid = $1 AND users.isactive = true`

            if (queries.length > 0) {
                getMembers += ` AND ${queries.join(' AND ')}`
            }

            getMembers += ` LIMIT ${limit} OFFSET ${offset}`;
            console.log(getMembers);

            pool.query(getMembers, projectid, (err, membersdata) => {
                if (err) throw (err);
                console.log(membersdata.rows)
                const userid = [req.session.user.userid];
                const getOptions = 'SELECT membersopt from users WHERE userid = $1';
                console.log(query)
                pool.query(getOptions, userid, (err, options) => {
                    res.render('overview/members/dashboard', {
                        projectid,
                        members: membersdata.rows,
                        currentPage,
                        totalPages,
                        url,
                        query,
                        options: options.rows[0].membersopt
                    });
                })
            })
        })

    })

    router.post('/members/:id', helpers.isLoggedIn, (req, res, next) => {
        const updateOptions = `UPDATE users SET membersopt = $1 WHERE userid = $2`;
        const data = [{
            ...req.body
        }, req.session.user.userid];
        pool.query(updateOptions, data, (err) => {
            if (err) throw err;
            res.redirect(`/projects/members/${req.params.id}`);
        })
    })

    router.get('/members/:id/add', helpers.isLoggedIn, (req, res, next) => {
        const projectid = req.params.id;
        const getUser = `SELECT userid, concat(firstname,' ',lastname) as fullname FROM users WHERE isactive = true AND userid NOT IN (select users.userid from members inner join users on users.userid = members.userid where members.projectid = $1)`
        pool.query(getUser, [projectid], (err, users) => {
            if (err) throw err;
            res.render('overview/members/add', {
                projectid,
                members: users.rows
            })
        })
    })

    router.post('/members/:id/add', helpers.isLoggedIn, (req, res, next) => {
        const projectid = req.params.id
        const addMember = 'INSERT INTO members (userid, projectid, role) VALUES ($1,$2,$3)'
        const body = [req.body.member, projectid, req.body.position];
        pool.query(addMember, body, (err) => {
            if (err) throw (err);
            console.log(addMember)
            console.log(body)
            res.redirect(`/projects/members/${projectid}/add`)
        })
    })

    router.get('/members/:id/edit/:userid', helpers.isLoggedIn, (req, res, next) => {
        const ids = [req.params.id, req.params.userid];
        let getMemberData = `select members.userid, members.role, CONCAT(users.firstname,' ', users.lastname) AS fullname from members 
        INNER JOIN users ON members.userid = users.userid WHERE members.projectid = $1 AND members.userid = $2`
        pool.query(getMemberData, ids, (err, member) => {
            if (err) throw err;
            console.log(member.rows[0]);
            res.render('overview/members/edit', {
                member: member.rows[0],
                projectid: ids[0]
            })
        })
    })

    router.post('/members/:id/edit/:userid', helpers.isLoggedIn, (req, res, next) => {
        const body = [req.body.position, req.params.id, req.params.userid];
        let updateMember = `UPDATE members SET role = $1 WHERE projectid = $2 AND userid = $3`
        pool.query(updateMember, body, (err) => {
            if (err) throw err;
            res.redirect(`/projects/members/${body[1]}/edit/${body[2]}`);
        })
    })

    router.get('/members/:id/delete/:userid', helpers.isLoggedIn, (req, res, next) => {
        const body = [req.params.id, req.params.userid];
        let deleteMember = `DELETE FROM members WHERE projectid = $1 AND userid = $2`
        pool.query(deleteMember, body, (err) => {
            if (err) throw err;
            res.redirect(`/projects/members/${body[0]}/`);
        })
    })

    router.get('/issues/:id', helpers.isLoggedIn, (req, res, next) => {
        const projectid = [req.params.id];
        const getIssues = 'SELECT * from issues where projectid = $1'
        pool.query(getIssues, projectid, (err, data) => {
            let issues = data.rows.map(issue => { 
                issue.startdate = moment(issue.startdate).format('LL')
                issue.duedate = moment(issue.duedate).format('LL')
                return issue;
            })
            console.log(issues);
            res.render('overview/issues/dashboard', {
                projectid,
                issues
            });
        })
    })

    router.post('/issues/:id', helpers.isLoggedIn, (req, res, next) => {
        const body = [...req.body];
        const projectid = req.params.id;
        console.log(body)
        res.redirect('');
    })

    router.get('/issues/:id/add', helpers.isLoggedIn, (req, res, next) => {
        const projectid = req.params.id;
        let getMembers = `SELECT userid, concat(firstname,' ',lastname) as fullname FROM users WHERE isactive = true AND userid IN (select users.userid from members inner join users on users.userid = members.userid where members.projectid = $1)`
        pool.query(getMembers, [projectid], (err, members) => {
        res.render('overview/issues/add', {
            projectid,
            members : members.rows
        })
    })
    })

    router.post('/issues/:id/add', helpers.isLoggedIn, (req, res, next) => {
        const projectid = req.params.id;
        const authorid = req.session.user.userid;
            const {tracker, subject, description, status, priority, assignee, startdate, duedate, estimatetime, done, file} = req.body;
            let addIssues = `INSERT INTO issues (projectid,tracker,subject,description,status,priority,assignee,startdate,duedate,estimatedate,done,files,author,createddate) 
                VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())`
            const issuesData = [projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatetime, done, file, authorid]
            pool.query(addIssues, issuesData, (err) => {
                if (err) throw err;
                res.redirect(`/projects/issues/${projectid}/add`);
            })
        })

    router.get('/issues/:id/edit/:issueid', helpers.isLoggedIn, (req, res, next) => {
        const projectid = req.params.id;
        const issuesid = req.params.issueid;
        res.render('overview/issues/edit', {
            projectid
        });
    })

    router.post('/issues/:id/edit/:issueid', helpers.isLoggedIn, (req, res, next) => {
        const projectid = req.params.id;
        const issueid = req.params.issueid
    })



    return router;
}