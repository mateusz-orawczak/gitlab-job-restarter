import fetch from 'node-fetch';

const BASE_URL = 'https://gitlab.lastminute.com'
const API_URL = '/api/v4'
const TOKEN = 'XXXX'
const PROJECT_ID = 5984;

const getTimestamp = () => {
  return new Date().toLocaleTimeString();
}

const getPipelines = async () => {
  return await getData(`/projects/${PROJECT_ID}/pipelines?status=running`)
}

const getPipeline = async (id) => {
  return await getData(`/projects/${PROJECT_ID}/pipelines/${id}`)
}

const getPipelineJobs = async (id) => {
  return await getData(`/projects/${PROJECT_ID}/pipelines/${id}/jobs`)
}

const retryJob = async (id) => {
  return await postData(`/projects/${PROJECT_ID}/jobs/${id}/retry`)
}

const getMergeRequests = async () => {

  return await getData('/merge_requests?state=opened')
}

const getMergeRequest = async (id) => {
  return await getData(`/projects/${PROJECT_ID}/merge_requests/${id}`)
}

const postData = async (path, body = null) => {
  const response = await sendRequest(path, 'POST');
  const json = await response.json();
  return json;
}

const getData = async (path) => {
    const response = await sendRequest(path, 'GET');
    const json = await response.json();
    return json;
}

const sendRequest = async (path, method, body = null) => {
  const url = `${BASE_URL}${API_URL}${path}`
  console.log(`${getTimestamp()} GET ${url}`)
  return await fetch(url, {
    method,
    body,
    "headers": {
        "PRIVATE-TOKEN": TOKEN,
        "Content-Type": "application/json"
    },
  });
}

const loop = async () => {
  const mergeRequests = await getMergeRequests();
  mergeRequests.forEach(mergeRequest => {
    getMergeRequest(mergeRequest.iid)
      .then(mergeRequestDetails => mergeRequestDetails.head_pipeline.id)
      .then(id => getPipeline(id), () => {})
      .then(pipelineDetails => getPipelineJobs(pipelineDetails.id))
      .then(pipelineJobs => pipelineJobs.filter(pipelineJob => pipelineJob.name === 'autodeploy').find(Boolean))
      .then(autodeploymentJob => {
        if (autodeploymentJob.status === 'failed') {
          retryJob(autodeploymentJob.id)
          console.log(`${autodeploymentJob.id} - ${autodeploymentJob.status} - restarted`)
        } else {
          console.log(`${autodeploymentJob.id} - ${autodeploymentJob.status}`)
        }
      })
  })
}

loop()
setInterval(loop, 60*1000)
