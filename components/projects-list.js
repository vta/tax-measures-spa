import React from 'react'
import Button from 'react-bootstrap/Button'
import Table from 'react-bootstrap/Table'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileCsv } from '@fortawesome/free-solid-svg-icons'
import { sortBy } from 'lodash'
import { CSVLink } from "react-csv";
import { formatCurrencyMillions } from '../lib/util'

const ProjectsList = props => {
  const {
    results,
    projects
  } = props

  if (!results || !results.length) {
    return null
  }

  const projectIds = [...results.reduce((memo, item) => {
    if (item.fields.Project) {
      memo.add(item.fields.Project[0])
    }
    if (item.fields.Projects) {
      for (const projectId of item.fields.Projects) {
        memo.add(projectId)
      }
    }
    return memo;
  }, new Set())]

  const filteredProjects = sortBy(projectIds.map(projectId => {
    return projects.find(p => p.id === projectId)
  }), 'fields.Name')

  const renderProjectRow = project => {
    const renderProjectLink = () => {
      if (project.fields.URL) {
        return (
          <a href={project.fields.URL} target="_blank" key={project.id}>{project.fields.Name}</a>
        )
      } else {
        return (
          <span key={project.id}>{project.fields.Name}</span>
        )
      }
    }

    return (
      <tr key={project.id}>
        <td>
          {renderProjectLink()}
        </td>
        <td>{project.fields['Category Name']}</td>
        <td className="text-right">
          {`${formatCurrencyMillions(project.fields.totalAllocationAmount)}m`}
        </td>
        <td className="text-right">
          {`${formatCurrencyMillions(project.fields.totalPaymentAmount)}m`}
        </td>
      </tr>
    )
  }

  const csvData = [
    ["Project", "Category", "URL", "Total Allocations", "Total Payments"],
    ...filteredProjects.map(project => {
      return [
        project.fields.Name,
        project.fields['Category Name'],
        project.fields.URL,
        project.fields.totalAllocationAmount,
        project.fields.totalPaymentAmount
      ]
    })
  ];

  return (
    <div className='row'>
      <div className='col'>
        <div className='card bg-blue text-white mb-3'>
          <div className='card-body'>
            <h3>Projects List</h3>
            <p>Below is a list of the projects correlated with the filter settings above</p>
            <Table responsive size="sm" className='project-table'>
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Category</th>
                  <th>Allocations</th>
                  <th>Payments</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map(renderProjectRow)}
              </tbody>
            </Table>
            <CSVLink
              data={csvData}
              filename={"vta-tax-measures.csv"}
              className="btn btn-primary btn-white-border float-right"
            >
              <FontAwesomeIcon icon={faFileCsv} className='mr-2' /> Download CSV
            </CSVLink>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectsList
