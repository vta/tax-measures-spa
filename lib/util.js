/* global fetch, window */
import algoliasearch from 'algoliasearch'

import { cloneDeep, maxBy, pick, sortBy, uniq } from 'lodash'
import querystring from 'querystring'
import bbox from '@turf/bbox'

import { categoryCards } from '../lib/category-cards'

const client = algoliasearch(process.env.NEXT_PUBLIC_ALGOLIA_APP_ID, process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY)
const index = client.initIndex('TAX_MEASURES_PROJECTS')

function sortByFiscalYear(project) {
  return project.fields['Fiscal Year'] ? project.fields['Fiscal Year'] * -1 : 0
}

function sortByGrantee(project) {
  return project.fields['Grantee Name'] || 'zzzzz'
}

export function sumCurrency(values) {
  return values.reduce((memo, value) => {
    memo += Math.round(value * 10)
    return memo
  }, 0) / 10
}

export function updateUrlWithFilters(filters, currentProjectIds) {
  if (!filters && !currentProjectIds) {
    window.history.replaceState({}, '', '?')
    return
  }

  const urlParameters = {}

  if (filters) {
    const {
      transactionType,
      grantee,
      project,
      category
    } = filters

    urlParameters.transactionType = transactionType
    urlParameters.grantee = grantee
    urlParameters.project = project
    urlParameters.category = category
  }

  if (currentProjectIds && currentProjectIds.length > 0) {
    urlParameters.project_ids = currentProjectIds.join(',')
  }

  window.history.replaceState({}, '', `?${querystring.stringify(urlParameters)}`)
}

export function getInitialFiltersFromUrlQuery(query) {
  const initialFilters = pick(query, [
    'transactionType',
    'grantee',
    'project',
    'category'
  ])

  if (initialFilters.grantee !== '' && typeof initialFilters.grantee === 'string') {
    initialFilters.grantee = [initialFilters.grantee]
  }

  if (initialFilters.category !== '' && typeof initialFilters.category === 'string') {
    initialFilters.category = [initialFilters.category]
  }

  return initialFilters
}

/* eslint-disable-next-line max-params */
export async function applyFilters(filters, awards, payments, projects, categories, grantees) {
  const results = {
    items: [],
    projects: [],
    filters
  }

  if (filters.transactionType === 'award') {
    results.transactionType = 'award'
    results.items.push(...awards)
  } else if (filters.transactionType === 'payment') {
    results.transactionType = 'payment'
    results.items.push(...payments)
  }

  // Apply category filter
  if (filters.category) {
    const filteredCategoryIds = categories.filter(c => filters.category.includes(c.fields.Name)).map(c => c.id)
    if (filteredCategoryIds) {
      results.items = results.items.filter(item => {
        if (!item.fields.Category) {
          return false
        }

        return filteredCategoryIds.includes(item.fields.Category.id) || filteredCategoryIds.includes(item.fields['Parent Category'].id)
      })
    }
  }

  // Apply grantee filter
  if (filters.grantee) {
    const filteredGranteeIds = grantees.filter(g => filters.grantee.includes(g.fields.Name)).map(g => g.id)
    if (filteredGranteeIds) {
      results.items = results.items.filter(item => {
        if (!item.fields.Grantee) {
          return false
        }

        return filteredGranteeIds.includes(item.fields.Grantee[0])
      })
    }
  }

  // Apply project filter
  if (filters.project) {
    const { hits } = await index.search(filters.project, {
      attributesToRetrieve: ['id']
    })

    const filteredProjectIds = hits.map(h => h.id)

    if (filteredProjectIds) {
      results.items = results.items.filter(item => {
        if (item.fields.Project) {
          return filteredProjectIds.includes(item.fields.Project[0])
        }

        return false
      })
    }
  }

  // After applying filters, find all relevant projects associated with the awards or payments
  const projectIds = uniq(results.items.filter(item => Boolean(item.fields.Project)).map(item => item.fields.Project[0]))

  // Filter associated projects
  const filteredProjects = projectIds.reduce((memo, projectId) => {
    const project = projects.find(p => p.id === projectId)
    let projectMatchesFilters = true

    if (!project) {
      projectMatchesFilters = false
    }

    if (filters.category) {
      if (!filters.category.includes(project.fields.Category.fields.Name) && !filters.category.includes(project.fields['Parent Category'].fields.Name)) {
        projectMatchesFilters = false
      }
    }

    if (filters.grantee) {
      if (!filters.grantee.includes(project.fields['Grantee Name'])) {
        projectMatchesFilters = false
      }
    }

    if (projectMatchesFilters) {
      memo.push(project)
    }

    return memo
  }, [])

  results.projects = sortBy(filteredProjects, [sortByFiscalYear, sortByGrantee])

  return results
}

function addProjectData(item, data) {
  let allocationId
  if (item.fields.Allocation) {
    allocationId = item.fields.Allocation[0]
  } else if (item.fields.Award) {
    const award = getAwardById(item.fields.Award[0], data.awards)

    if (award && award.fields.Project && award.fields.Project.length > 0) {
      item.fields.Project = award.fields.Project
    }

    if (award && award.fields.Allocation && award.fields.Allocation.length > 0) {
      allocationId = award.fields.Allocation[0]
    }
  }

  // Get category by allocation
  if (allocationId) {
    const allocation = getAllocationById(allocationId, data.allocations)
    const category = getCategoryById(allocation.fields.Category.id, data.categories)
    const parentCategory = getParentCategoryByCategory(category, data.categories)

    item.fields.Category = cloneDeep(category)
    item.fields['Parent Category'] = cloneDeep(parentCategory)
  } else {
    item.fields.Category = { fields: { Name: 'Uncategorized' } }
    item.fields['Parent Category'] = { fields: { Name: 'Uncategorized' } }
  }

  if (item.fields.Project) {
    const project = getProjectById(item.fields.Project[0], data.projects)

    if (project) {
      // Get a list of all grantees for each item
      if (project.fields.Grantee) {
        item.fields.Grantee = project.fields.Grantee
      }
    }
  }
}

export async function preprocessData(data) {
  // Organize categories hierarchically
  data.parentCategories = data.categories.filter(c => !c.fields['Parent Category'])

  for (const project of data.projects) {
    // Populate category, parent category and subcategory for each project

    if (project.fields.Allocations) {
      const allocations = project.fields.Allocations.map(allocationId => getAllocationById(allocationId, data.allocations))

      // Use allocation with largest amount to get project category
      const largestAllocation = maxBy(allocations, 'fields.Amount')

      if (largestAllocation && largestAllocation.fields.Category) {
        const category = getCategoryById(largestAllocation.fields.Category[0], data.categories)
        const parentCategory = getParentCategoryByCategory(category, data.categories)

        project.fields.Category = cloneDeep(category)
        project.fields['Parent Category'] = cloneDeep(parentCategory)
      }

      if (project.fields.Awards) {
        project.fields.Payments = uniq(project.fields.Awards.reduce((memo, awardId) => {
          const award = getAwardById(awardId, data.awards)

          if (award && award.fields.Payments && award.fields.Payments.length > 0) {
            memo.push(...award.fields.Payments)
          }

          return memo
        }, []))
      }
    }

    // Fall back to "Uncategorized" if no category is found
    if (!project.fields.Category) {
      project.fields.Category = { fields: { Name: 'Uncategorized' } }
      project.fields['Parent Category'] = { fields: { Name: 'Uncategorized' } }
    }

    if (!project.fields['Parent Category'].id || project.fields.Category.id === project.fields['Parent Category'].id) {
      project.fields.Subcategory = { fields: { Name: '' } }
    } else {
      project.fields.Subcategory = cloneDeep(project.fields.Category)
    }

    // Get grantee name for each project
    if (project.fields.Grantee) {
      const grantee = getGranteeByProject(project, data.grantees)
      project.fields['Grantee Name'] = grantee.fields.Name
    }
  }

  for (const allocation of data.allocations) {
    // Populate category for each allocation
    const category = getCategoryById(allocation.fields.Category[0], data.categories)
    const parentCategory = getParentCategoryByCategory(category, data.categories)

    allocation.fields.Category = cloneDeep(category)
    allocation.fields['Parent Category'] = cloneDeep(parentCategory)

    // Get a list of all grantees for each allocation
    if (allocation.fields.Project) {
      allocation.fields.Grantees = [...allocation.fields.Project.reduce((memo, projectId) => {
        const project = getProjectById(projectId, data.projects)

        if (project && project.fields && project.fields.Grantee) {
          memo.add(project.fields.Grantee[0])
        }

        return memo
      }, new Set())]
    }
  }

  for (const award of data.awards) {
    addProjectData(award, data)
  }

  for (const payment of data.payments) {
    addProjectData(payment, data)
  }

  // Fetch geojson for projects
  await Promise.all(data.projects.filter(p => p.fields.geojson).map(async project => {
    try {
      const response = await fetch(project.fields.geojson[0].url)

      if (response.ok) {
        const geojson = await response.json()
        const layerBbox = bbox(geojson)

        if (!isValidBbox(layerBbox)) {
          throw new Error('geojson outside of bbox')
        }

        project.fields.geometry = geojson
        project.fields.bbox = layerBbox
        project.fields.hasProjectGeometry = true
      }
    } catch (error) {
      console.warn(`Invalid geometry for project "${project.fields.Name}"`)
      console.warn(project.fields.geojson[0])
      console.warn(error)
    }
  }))

  // Process Latitude Longitude fields
  data.projects.filter(p => p.fields.Latitude && p.fields.Longitude).map(async project => {
    const geojson = {
      type: 'Feature',
      properties: {
        projectId: project.id
      },
      geometry: {
        type: 'Point',
        coordinates: [
          project.fields.Longitude,
          project.fields.Latitude
        ]
      }
    }

    project.fields.geometry = geojson
    project.fields.bbox = bbox(geojson)
    project.fields.hasProjectGeometry = true
  })

  // Fetch geojson for grantees
  await Promise.all(data.grantees.filter(g => g.fields.geojson).map(async grantee => {
    try {
      const response = await fetch(grantee.fields.geojson[0].url)

      if (response.ok) {
        const geojson = await response.json()
        const layerBbox = bbox(geojson)

        if (!isValidBbox(layerBbox)) {
          throw new Error('geojson outside of bbox')
        }

        grantee.fields.geometry = geojson
        grantee.fields.bbox = layerBbox
      }
    } catch (error) {
      console.warn(`Invalid geometry for grantee "${grantee.fields.Name}"`)
      console.warn(grantee.fields.geojson[0])
      console.warn(error)
    }
  }))

  // Sum project fields last
  for (const project of data.projects) {
    // Get total payments for each project
    project.fields.totalPaymentAmount = sumCurrency(data.payments.filter(payment => {
      if (!payment.fields.Project) {
        return false
      }

      return payment.fields.Project[0] === project.id
    }).map(payment => payment.fields.Amount))

    // Get total allocations for each project
    project.fields.totalAllocationAmount = sumCurrency(data.allocations.filter(allocation => {
      if (!allocation.fields.Project) {
        return false
      }

      return allocation.fields.Project.includes(project.id)
    }).map(allocation => allocation.fields.Amount))

    // Get total awards for each project
    project.fields.totalAwardAmount = sumCurrency(data.awards.filter(award => {
      if (!award.fields.Project) {
        return false
      }

      return award.fields.Project[0] === project.id
    }).map(allocation => allocation.fields['Award Amount']))
  }

  return data
}

export function isValidBbox(bbox) {
  if (bbox[0] > 180 || bbox[0] < -180) {
    return false
  }

  if (bbox[1] > 90 || bbox[1] < -90) {
    return false
  }

  if (bbox[2] > 180 || bbox[2] < -180) {
    return false
  }

  if (bbox[3] > 90 || bbox[3] < -90) {
    return false
  }

  return true
}

export function mergeBboxes(bboxes) {
  return bboxes.reduce((memo, bbox) => {
    memo[0] = Math.min(memo[0], bbox[0])
    memo[1] = Math.min(memo[1], bbox[1])
    memo[2] = Math.max(memo[2], bbox[2])
    memo[3] = Math.max(memo[3], bbox[3])
    return memo
  }, [180, 90, -180, -90])
}

export function getViewport(bbox) {
  const [minLng, minLat, maxLng, maxLat] = bbox

  const lngDelta = maxLng - minLng
  const latDelta = maxLat - minLat
  const degreeDelta = Math.max(lngDelta, latDelta)

  let zoom = 7
  if (degreeDelta > 0.8) {
    zoom = 7
  } else if (degreeDelta > 0.35) {
    zoom = 8
  } else if (degreeDelta > 0.3) {
    zoom = 9
  } else if (degreeDelta > 0.25) {
    zoom = 10
  } else if (degreeDelta > 0.07) {
    zoom = 11
  } else if (degreeDelta > 0.01) {
    zoom = 12
  } else {
    zoom = 13
  }

  return {
    latitude: (maxLat + minLat) / 2,
    longitude: (maxLng + minLng) / 2,
    zoom,
    bearing: 0,
    pitch: 0
  }
}

export function getGranteeByProject(project, grantees) {
  if (!project.fields.Grantee || !grantees) {
    return null
  }

  return grantees.find(g => g.id === project.fields.Grantee[0])
}

export function getProjectById(id, projects) {
  return projects.find(p => p.id === id)
}

export function getAwardById(id, awards) {
  return awards.find(a => a.id === id)
}

export function getAllocationById(id, allocations) {
  return allocations.find(a => a.id === id)
}

export function getCategoryById(id, categories) {
  if (id === undefined) {
    return { fields: { Name: 'Uncategorized' } }
  }

  return categories.find(c => c.id === id)
}

export function getParentCategoryByCategory(category, categories) {
  return category.fields['Parent Category'] ? getCategoryById(category.fields['Parent Category'][0], categories) : category
}

export function getSingleCategoryCard(filters, categories) {
  if (!categories || !filters || !filters.category || filters.category.length !== 1) {
    return
  }

  const currentSingleCategory = categories.find(c => c.fields.Name === filters.category[0])

  if (!currentSingleCategory) {
    return
  }

  const currentSingleCategoryParent = getParentCategoryByCategory(currentSingleCategory, categories)

  return categoryCards.find(c => c.key === currentSingleCategoryParent.fields.Name)
}
