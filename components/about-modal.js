import React, { useState } from 'react'
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
        <h4>What is Measure B?</h4>
        <p>
          A 30-year, half-cent countywide sales tax to enhance transit, highways, expressways and active transportation (bicycles, pedestrians and complete streets). The measure passed by nearly 72%, the highest level of support for any Santa Clara County transportation tax. <a href="https://www.vta.org/projects/funding/2016-measure-b">Read More &raquo;</a>
        </p>

        <h4>What is this website?</h4>
        <p>
          A tool for tracking the performance of 2016 Measure B projects and programs and reporting how funding recipients are delivering on promises made to the taxpayers.​
        </p>

        <h4>Where can I submit questions?</h4>
        <p>
          Email us at <a href="mailto:measureb@vta.org">measureb@vta.org</a>.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={props.onHide} className='btn-secondary'>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default AboutModal