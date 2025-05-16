// example importing of other functions (taken from another project):

// const getInvestors = require('./prototype-get-investors').handler;
// const getTotalRaised = require('./prototype-get-total-raised').handler;
// const updateInvestorEmail = require('./prototype-update-investor-email').handler;
// const updateInvestorAddress = require('./prototype-update-investor-address').handler;
// const assistentFeatureRequest = require('./prototype-assistent-feature-request').handler;
// const findCrmContactByInvestorId = require('./prototype-find-crm-contact-by-investor-id').handler;
// const updateCrmContact = require('./prototype-update-crm-contact').handler;
// const getTextSnippets = require('./prototype-get-text-snippets').handler;
// const updateTextSnippets = require('./prototype-update-text-snippets').handler;

exports.handler = async function (event, context) {
  // Parse input
  const parsedBody = JSON.parse(event.body)
  const { function_name, arguments: providedArguments } = parsedBody
  
  
  console.log(`Executing function ${function_name} with arguments ${providedArguments}`)
  
  // Parse function arguments if provided as string
  const parsedArguments = typeof providedArguments === 'string' ? JSON.parse(providedArguments) : providedArguments
  
  try {
    switch (function_name) {
// example handling of other functions (taken from another project):

    //   case 'get_total_raised':
    //     return await getTotalRaised({
    //       body: JSON.stringify({ tenantId })
    //     }, context)
        
    //   case 'list_investors':
    //     return await getInvestors({
    //       body: JSON.stringify({ tenantId })
    //     }, context)
        
    //   case 'update_investor_email': {
    //     const { investorId, newEmail } = parsedArguments
    //     return await updateInvestorEmail({
    //       body: JSON.stringify({ tenantId, investorId, newEmail })
    //     }, context)
    //   }
      
    //   case 'update_investor_address': {
    //     const { investorId, newAddress, newCity, newPostcode, newCountry } = parsedArguments
    //     return await updateInvestorAddress({
    //       body: JSON.stringify({ tenantId, investorId, newAddress, newCity, newPostcode, newCountry })
    //     }, context)
    //   }
      
    //   case 'submit_feature_request': {
    //     const { featureRequest } = parsedArguments
    //     // Store tenant ID with feature request
    //     return await assistentFeatureRequest({
    //       body: JSON.stringify({ featureRequest, tenantId })
    //     }, context)
    //   }
      
    //   case 'find_crm_contact_by_investor_id': {
    //     const { investorId } = parsedArguments
    //     return await findCrmContactByInvestorId({
    //       body: JSON.stringify({ tenantId, investorId })
    //     }, context)
    //   }
    //   case 'update_crm_contact': {
    //     // contactId is required for update
    //     // other fields are optional, but at least one must be provided, and all provided must be of type string or number
    //     const { contactId, firstname, lastname, phone, address, postcode, city, streetNumber } = parsedArguments
    //     return await updateCrmContact({
    //       body: JSON.stringify({ tenantId, contactId, firstname, lastname, phone, address, postcode, city, streetNumber })
    //     }, context)
    //   }
      
    //   case 'get_text_snippets': {
    //     return await getTextSnippets({
    //       body: JSON.stringify({ tenantId })
    //     }, context)
    //   }
      
    //   case 'update_text_snippets': {
    //     const { textSnippets } = parsedArguments
    //     return await updateTextSnippets({
    //       body: JSON.stringify({ tenantId, textSnippets })
    //     }, context)
    //   }
      
      default:
        console.error(`Unknown function: ${function_name}`)
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Unknown function: ${function_name}` })
        }
    }
  } catch (error) {
    console.error(`Error executing function ${function_name}:`, error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'An unknown error occurred' })
    }
  }
}