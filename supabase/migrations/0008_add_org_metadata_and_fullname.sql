-- Add organization metadata fields to tenants table
alter table tenants add column org_size text;
alter table tenants add column org_industry text;
alter table tenants add column org_description text;

-- Add fullName to profiles table
alter table profiles add column full_name text;

-- Add constraint for org_size values
alter table tenants add constraint tenants_org_size_check
  check (org_size is null or org_size in ('1-10', '11-50', '51-200', '201-500', '501+'));
