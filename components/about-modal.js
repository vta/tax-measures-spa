import React from 'react'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'

const AboutModal = props => {
  return (
    <Modal
      {...props}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          About 2016 Measure B
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h4>What is 2016 Measure B?</h4>
        <p>
          A 30-year, half-cent countywide sales tax to enhance transit, highways, expressways and active transportation (bicycles, pedestrians and complete streets). The measure passed by nearly 72%, the highest level of support for any Santa Clara County transportation tax. <a href="https://www.vta.org/projects/funding/2016-measure-b">Read More &raquo;</a>
        </p>

        <h4>What is this website?</h4>
        <p>
          This website is a window into 2016 Measure B revenue and spending. You can search, view and share unaudited financial information about programs and projects, updated quarterly or as new information is released.
        </p>

        <h4>Where can I submit questions or feedback?</h4>
        <p>
          Email us at <a href="mailto:2016MeasureB@vta.org">2016MeasureB@vta.org</a> or <a href="https://surveys.hotjar.com/s?siteId=1873169&surveyId=162313" target="_blank">complete this survey</a> to provide feedback.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={props.onHide} className="btn-secondary">Close</Button>
      </Modal.Footer>
    </Modal>
  )
}

export default AboutModal
