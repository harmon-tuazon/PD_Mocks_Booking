#!/usr/bin/env node

const fs = require('fs');

// Load schema results
const schemaData = JSON.parse(fs.readFileSync('./hubspot-schema-results.json', 'utf8'));

function extractAllProperties(properties) {
  // Filter out archived properties but include all business properties
  return properties
    .filter(prop => !prop.archived)
    .filter(prop => {
      const name = prop.name.toLowerCase();
      // Only skip the most basic system properties
      if (name === 'hs_object_id' || name === 'createdate' || name === 'lastmodifieddate') return false;
      return true;
    })
    .map(prop => ({
      name: prop.name,
      type: prop.type,
      fieldType: prop.fieldType,
      label: prop.label || prop.name,
      required: prop.required || false,
      description: prop.description || '',
      groupName: prop.groupName || '',
      options: prop.options || []
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Extract complete properties for Enrollments and Courses
const objectsToExtract = ['enrollments', 'courses'];

objectsToExtract.forEach(objectName => {
  const objectData = schemaData[objectName];

  if (objectData && objectData.success) {
    const allProps = extractAllProperties(objectData.properties);

    console.log(`=== ${objectName.toUpperCase()} OBJECT ===`);
    console.log(`Total Properties: ${allProps.length}`);
    console.log(`Object ID: ${objectData.objectId}`);
    console.log('');

    console.log('#### Complete Schema Definition');
    console.log('');
    console.log('| Property | Type | Field Type | Required | Group | Description | Label |');
    console.log('|----------|------|------------|----------|-------|-------------|-------|');

    allProps.forEach(prop => {
      const name = `\`${prop.name}\``;
      const type = prop.type || 'String';
      const fieldType = prop.fieldType || prop.type || 'text';
      const required = prop.required ? 'Yes' : 'No';
      const group = prop.groupName || 'Default';
      const description = (prop.description || '').replace(/\|/g, '\\|').replace(/\n/g, ' ').substring(0, 80);
      const label = (prop.label || '').replace(/\|/g, '\\|');

      console.log(`| ${name} | ${type} | ${fieldType} | ${required} | ${group} | ${description} | ${label} |`);
    });

    console.log('');
    console.log('---');
    console.log('');
  }
});