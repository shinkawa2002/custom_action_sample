import * as Hub from "looker-action-hub/lib/hub"

import * as helpers from "@sendgrid/helpers"
const AdmZip = require('adm-zip')
const iconv = require('iconv-lite')
const sgMail = require('@sendgrid/mail')

export class SendWithEncodeAction extends Hub.Action {
 
  name = "send_with_encode"
  label = "Send with Encoding"
  description = "Send File with Re-Encoding"
  supportedActionTypes = [Hub.ActionType.Cell, Hub.ActionType.Query, Hub.ActionType.Dashboard]
  params = [
    {
      name: "send_grid_api_key",
      label: "Send Grid API Key",
      required: true,
      sensitive: false,
      description: "API key for sending email through Send Grid"
    },
    {
      name: "sender",
      label: "Mail Sender",
      required: true,
      sensitive: false,
      description: "Mail Sender Email Address"
    }
  ]

  async form() {
    const form = new Hub.ActionForm()

    form.fields = [
      {
        name: "recipient", 
        label: "Receipient Address", 
        required: true, 
        type:"string"
      },
      {
        name: "messaage", 
        label: "Message", 
        required: false, 
        type: "textarea",
      },
      {
        name: "encoding", 
        label: "Encoding", 
        required: true, 
        type: "select",
        options: [
          {name: "Shift_JIS", label: "Shift_JIS"},
          {name: "Windows-31j,", label: "Windows-31j"}    
        ]
      },
      {
        name: "filenname",
        label: "File Name",
        required: true,
        type: "string"
      }
    ]

    return form
  }

  async execute(request: Hub.ActionRequest) {
    if (!request.formParams.recipient) {
      throw "Need Mail Receipent"
    }

    const attachment = request.attachment
    
    if (!attachment || !attachment?.mime || attachment?.mime !== "application/zip;base64") {
      return new Hub.ActionResponse({success: false, message: "Need CSV/Zip Attachment"})
    }
    // read zip
    const buffer = attachment.dataBuffer
    const zip = new AdmZip(buffer)
    const zipEntries = zip.getEntries()

    const wZip = new AdmZip()

    zipEntries.forEach((entry: any) => {
      const decoded = iconv.decode(Buffer.from(zip.readAsText(entry), 'utf8'), 'utf8')
      const encoded = iconv.encode(decoded, request.formParams.encoding)
      wZip.addFile(entry.entryName, Buffer.alloc(encoded.length, encoded))
    })

    const attachZip = wZip.toBuffer().toString("base64")

    // //send email
    // sgMail.setApiKey(request.params.send_grid_api_key)

    const filename = request.formParams.filename || request.suggestedFilename()
    const plan = request.scheduledPlan
    const message = request.formParams["messaage"] ? request.formParams["messaage"] : "Results are attached."
    const subject = request.formParams.subject || (plan && plan.title ? plan.title : "Looker")
    const from = request.formParams.sender ? request.formParams.sender : "Looker <noreply@lookermail.com>"


    const msg = new helpers.classes.Mail({
      to: request.formParams["recipient"],
      from: from,
      subject: subject,
      text: message,
      html: `<p>${message}</p>`,
      attachments: [
        {
          content: attachZip,
          filename: filename,
          type: 'application/zip',
          disposition: 'attachment',
          contentId: request.actionId
        }
      ]
    })

    let response = {success: true, message: "ok"}
    try {
      await this.sendEmail(request, msg)
    } catch (e) {
      response = {success: false, message: e.message}
    }

    return new Hub.ActionResponse(response)
  }

  async sendEmail(request: Hub.ActionRequest, msg: helpers.classes.Mail) {
    const client = this.sgMailClientFromRequest(request)
    return await client.send(msg)
  }

  private sgMailClientFromRequest(request: Hub.ActionRequest) {
    sgMail.setApiKey(request.params.send_grid_api_key)
    return sgMail

  }
}

Hub.addAction(new SendWithEncodeAction())
