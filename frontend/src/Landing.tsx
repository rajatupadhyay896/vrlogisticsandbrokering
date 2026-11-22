import {useState} from 'react';

export function Landing({loads,trucks,connected}:{loads:number;trucks:number;connected:boolean}){
  const [imageFailed,setImageFailed]=useState(false);
  return <section className="dispatch"><div className="dispatch-copy">
    <h1>Road freight bookings</h1>
    <p>Request a truck for your shipment or find a load for your vehicle. Our freight desk coordinates the rate, placement and delivery paperwork.</p>
    <div className="dispatch-actions"><a className="btn primary" href="#post-load" data-page="post-load">Request a truck</a>
    <a className="btn" href="#find-loads" data-page="find-loads">Find loads</a></div>
    <a className="owner-link" href="#list-truck" data-page="list-truck">List your truck</a>
    <nav className="service-links"><a href="#transporters">For transporters</a><a href="#truck-owners">For truck owners</a><a href="#track">Track a shipment</a></nav>
  </div><div className="dispatch-board">
    {!imageFailed&&<img className="truck-photo" src="/freight-truck.webp" onError={()=>setImageFailed(true)} alt="Freight truck on an Indian highway" width="551" height="573"/>}
    <div className="board-links"><a href="#find-loads" data-page="find-loads"><b>{connected?loads:'—'}</b><span>Open loads</span></a>
    <a href="#find-trucks" data-page="find-trucks"><b>{connected?trucks:'—'}</b><span>Available trucks</span></a></div>
  </div></section>;
}
