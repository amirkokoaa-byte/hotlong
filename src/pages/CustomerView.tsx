import React from 'react';
import CustomerPage from './Customer';
import { CustomerPortal } from '../components/CustomerPortal';

export default function CustomerView(props: any) {
  if (props && props.config) {
    return <CustomerPortal {...props} />;
  }
  return <CustomerPortal config={props?.config} {...props} />;
}
