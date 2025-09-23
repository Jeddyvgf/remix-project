import React, { useState, useRef, useEffect } from 'react';
import { Alert, Button, Form, Card, Row, Col } from 'react-bootstrap';
import { FormattedMessage, useIntl } from 'react-intl';
import { initInstance } from '../../actions';

const CreateInstance: React.FC = () => {
  const intl = useIntl()
  const [formVal, setFormVal] = useState({
    address: '',
    htmlTemplate: '',
    name: '',
    network: '',
  });
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (iframeRef.current && formVal.htmlTemplate && showPreview) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(formVal.htmlTemplate);
        doc.close();
      }
    }
  }, [formVal.htmlTemplate, showPreview])
  return (
    <Form
      className="w-50 m-auto"
      onSubmit={(e: any) => {
        e.preventDefault();
        initInstance({ ...formVal });
      }}
    >
      <Form.Group className="mb-2" controlId="formAddress">
        <Form.Label className="text-uppercase mb-0"><FormattedMessage id="quickDapp.address" /></Form.Label>
        <Form.Control
          type="address"
          placeholder={intl.formatMessage({ id: 'quickDapp.enterAddress' })}
          value={formVal.address}
          onChange={(e) => {
            setFormVal({ ...formVal, address: e.target.value });
          }}
        />
      </Form.Group>

      <Form.Group className="mb-2" controlId="formHtmlTemplate">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <Form.Label className="text-uppercase mb-0">HTML Template</Form.Label>
          {formVal.htmlTemplate && (
            <Button 
              size="sm" 
              variant="outline-primary"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
          )}
        </div>
        <Row>
          <Col lg={showPreview ? 6 : 12}>
            <Form.Control
              as="textarea"
              rows={10}
              type="htmlTemplate"
              placeholder={intl.formatMessage({ id: 'quickDapp.enterHtmlTemplate', defaultMessage: 'Enter your HTML template for the dApp frontend...' })}
              value={formVal.htmlTemplate}
              onChange={(e) => {
                setError('')
                const template = e.target.value;
                if (template && !template.includes('<html') && !template.includes('<!DOCTYPE')) {
                  setError('Please provide a complete HTML document with <html> or <!DOCTYPE> tag');
                }
                setFormVal({ ...formVal, htmlTemplate: template });
              }}
            />
            {error && <Form.Text className='text-danger'>
              {error}
            </Form.Text>}
          </Col>
          {showPreview && (
            <Col lg={6}>
              <Card className="h-100">
                <Card.Header className="py-1 px-2">
                  <small className="text-muted">Preview</small>
                </Card.Header>
                <Card.Body className="p-0">
                  <iframe
                    ref={iframeRef}
                    style={{
                      width: '100%',
                      height: '300px',
                      border: 'none',
                      backgroundColor: 'white'
                    }}
                    title="Template Preview"
                    sandbox="allow-popups allow-scripts allow-same-origin allow-forms allow-top-navigation"
                  />
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>
      </Form.Group>

      <Form.Group className="mb-2" controlId="formName">
        <Form.Label className="text-uppercase mb-0"><FormattedMessage id="quickDapp.name" /></Form.Label>
        <Form.Control
          type="name"
          placeholder={intl.formatMessage({ id: 'quickDapp.enterName' })}
          value={formVal.name}
          onChange={(e) => {
            setFormVal({ ...formVal, name: e.target.value });
          }}
        />
      </Form.Group>

      <Form.Group className="mb-2" controlId="formNetwork">
        <Form.Label className="text-uppercase mb-0"><FormattedMessage id="quickDapp.network" /></Form.Label>
        <Form.Control
          type="network"
          placeholder={intl.formatMessage({ id: 'quickDapp.enterNetwork' })}
          value={formVal.network}
          onChange={(e) => {
            setFormVal({ ...formVal, network: e.target.value });
          }}
        />
      </Form.Group>
      <Button
        variant="primary"
        type="submit"
        className="mt-2"
        data-id="createDapp"
        disabled={
          !formVal.address ||
          !formVal.name ||
          !formVal.network ||
          !formVal.htmlTemplate
        }
      >
        <FormattedMessage id="quickDapp.submit" />
      </Button>
      <Alert className="mt-4" variant="info" data-id="quickDappTooltips">
        <FormattedMessage id="quickDapp.text1" />
        <br />
        <FormattedMessage id="quickDapp.text2" />
      </Alert>
      <img src='./assets/edit-dapp.png' />
    </Form>
  );
};

export default CreateInstance;
