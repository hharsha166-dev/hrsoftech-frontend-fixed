import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

export default function AdminApplicationView() {
  const { id } = useParams();
  const [application, setApplication] = useState(null);

  useEffect(() => {
    api.get(`/admin/applications/${id}`)
      .then((res) => setApplication(res.data.application))
      .catch(console.error);
  }, [id]);

  if (!application) {
    return <p>Loading...</p>;
  }

  return (
    <div className="card">
      <h2>Application Details</h2>

      <table>
        <tbody>
          <tr>
            <td><b>Applicant Name</b></td>
            <td>{application.full_name}</td>
          </tr>

          <tr>
            <td><b>Retailer</b></td>
            <td>{application.business_name}</td>
          </tr>

          <tr>
            <td><b>Application Type</b></td>
            <td>{application.application_type}</td>
          </tr>

          <tr>
            <td><b>Status</b></td>
            <td>{application.status}</td>
          </tr>

          <tr>
            <td><b>Aadhaar</b></td>
            <td>{application.aadhaar_number}</td>
          </tr>

          <tr>
            <td><b>Mobile</b></td>
            <td>{application.mobile}</td>
          </tr>

          <tr>
            <td><b>Email</b></td>
            <td>{application.email}</td>
          </tr>

          <tr>
            <td><b>NSDL Ack Number</b></td>
            <td>{application.nsdl_ack_number || '-'}</td>
          </tr>

          <tr>
            <td><b>Remarks</b></td>
            <td>{application.remarks || '-'}</td>
          </tr>

        </tbody>
      </table>
    </div>
  );
}
