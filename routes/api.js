'use strict';
const mongoose = require("mongoose");
const IssueModel = require("../models").Issue;
const ProjectModel = require("../models").Project;
const { ObjectId } = require('mongoose').Types;

async function handlePostRequest(req, res) {
  try {
    const project = req.params.project;
    const { issue_title, issue_text, created_by, assigned_to, status_text } = req.body;

    if (!issue_title || !issue_text || !created_by) {
      res.json({ error: "required field(s) missing" });
      return;
    }

    const newIssue = new IssueModel({
      issue_title: issue_title || "",
      issue_text: issue_text || "",
      created_on: new Date(),
      updated_on: new Date(),
      created_by: created_by || "",
      assigned_to: assigned_to || "",
      open: true,
      status_text: status_text || "",
    });


    const projectData = await ProjectModel.findOne({ name: project }).exec();

    if (!projectData) {

      const newProject = new ProjectModel({ name: project });

      newProject.issues.push(newIssue);

      const savedProject = await newProject.save();

      if (!savedProject) {
        res.json({ error: "There was an error saving in post" });
      } else {
        res.json(newIssue);
      }
    } else {

      projectData.issues.push(newIssue);
      const savedProjectData = await projectData.save();
      if (!savedProjectData) {
        res.json({ error: "There was an error saving in post" });
      } else {
        res.json(newIssue);

      }
    }
  } catch (err) {
    res.json({ error: "There was an error: " + err.message });
  }
}

module.exports = function(app) {
  app.route('/api/issues/:project')
    .get(async function(req, res) {
      let projectName = req.params.project;
      const {
        _id,
        open,
        issue_title,
        issue_text,
        created_by,
        assigned_to,
        status_text,
      } = req.query;
      const projectData = await ProjectModel.findOne({ name: projectName }).exec();

      if (!projectData) {
        return res.json({ error: "Project not found" });
      }

      let data = await ProjectModel.aggregate([
        { $match: { "_id": projectData._id } },
        { $unwind: "$issues" },
        _id != undefined
          ? { $match: { "issues._id": new ObjectId(_id) } }
          : { $match: {} },
        open != undefined
          ? { $match: { "issues.open": open } }
          : { $match: {} },
        issue_title != undefined
          ? { $match: { "issues.issue_title": issue_title } }
          : { $match: {} },
        issue_text != undefined
          ? { $match: { "issues.issue_text": issue_text } }
          : { $match: {} },
        created_by != undefined
          ? { $match: { "issues.created_by": created_by } }
          : { $match: {} },
        assigned_to != undefined
          ? { $match: { "issues.assigned_to": assigned_to } }
          : { $match: {} },
        status_text != undefined
          ? { $match: { "issues.status_text": status_text } }
          : { $match: {} },
      ]).exec()



      if (!data) {
        res.json([]);
      } else {
        let mappedData = data.map((item) => item.issues);
        res.json(mappedData);
      }
    })

    .post(async function(req, res) {
      await handlePostRequest(req, res);
    })
    .put(async function(req, res) {
      try {
        const project = req.params.project;
        const { _id, ...updateFields } = req.body;

        if (!_id) {
          return res.json({ error: 'missing _id' });
        }

        if (Object.keys(updateFields).length === 0) {
          return res.json({ error: 'no update field(s) sent', _id });
        }

        const projectData = await ProjectModel.findOne({ name: project }).exec();

        if (!projectData) {
          return res.json({ error: 'Project not found', _id });
        }

        const issue = projectData.issues.id(_id);

        if (!issue) {
          return res.json({ error: 'could not update', _id });
        }


        for (const field in updateFields) {
          issue[field] = updateFields[field];
        }

        issue.updated_on = new Date();


        await projectData.save();


        return res.json({ result: 'successfully updated', '_id': req.body._id })
      } catch (err) {
        res.json({ error: 'could not update', _id });
      }
    })
    .delete(async function(req, res) {
      try {
        const project = req.params.project;
        const id = req.body._id;

        if (!id) {
          return res.json({ error: 'missing _id' });
        }

        const projectData = await ProjectModel.findOne({ name: project }).exec();

        if (!projectData) {
          return res.json({ error: 'Project not found', _id: id });
        }


        const issueIndex = projectData.issues.findIndex((issue) => issue._id.toString() === id);

        if (issueIndex === -1) {
          return res.json({ error: 'could not delete', _id: id });
        }
        projectData.issues.splice(issueIndex, 1);

        await projectData.save();

        return res.json({ result: 'successfully deleted', _id: id });
      } catch (err) {
        res.json({ error: 'could not delete', _id: req.body._id });
      }
    })

};
