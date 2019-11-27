import React, { useState } from 'react'
import ReactMapGL, { NavigationControl, Popup } from 'react-map-gl'
import getConfig from 'next/config'
const { publicRuntimeConfig } = getConfig()
import MapLayer from '../components/map-layer'
import { getViewport } from '../lib/util'

const ProjectsMap = ({ results, grantees, setProjectModalProjects }) => {
  const onMapClick = event => {
    const { features } = event

    const projectIds = features.map(f => f.properties.projectId)
    const projects = results.projects.filter(project => projectIds.includes(project.id))

    if (!projects.length) {
      return
    }

    setProjectModalProjects(projects)
  }

  const { layers, layerIds, bbox } = MapLayer(results.projects, grantees)
  const [viewport, setViewport] = useState(getViewport(bbox))

  if  (layers.length === 0) {
    return (
      <div>
        <p>&nbsp;</p>
        <div className="text-center font-weight-bold mt-5">No map available</div>
      </div>
    )
  }

  return (
    <div className="map">
      <ReactMapGL
        mapboxApiAccessToken={publicRuntimeConfig.mapboxAccessToken}
        width="100%"
        height="100%"
        {...viewport}
        interactiveLayerIds={layerIds}
        onViewportChange={viewport => setViewport(viewport)}
        onClick={onMapClick}
      >
        {layers}
        <div className="nav" className="map-nav">
          <NavigationControl onViewportChange={viewport => setViewport(viewport)} />
        </div>
      </ReactMapGL>
      <style jsx>{`
        .map {
          clear: both;
          height: 350px;
        }

        .map-nav {
          position: absolute;
          top: 0;
          left: 0;
          padding: 10px;
        }
      `}</style>
    </div>
  )
}

export default ProjectsMap
