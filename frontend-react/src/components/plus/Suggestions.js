import React from "react"
import { Button, List, Image, Divider } from "semantic-ui-react"
import { useQuery } from "@apollo/react-hooks"

import SuggestionForm from "./SuggestionForm"
import { suggestions } from "../../graphql/queries/suggestions"
import Loading from "../common/Loading"
import Error from "../common/Error"
import { vouches } from "../../graphql/queries/vouches"
import UserAvatar from "../common/UserAvatar"

const SuggestionList = ({ suggestionsArray }) => {
  if (suggestionsArray.length === 0) return null

  const suggestionLists = suggestionsArray.map(suggestion => (
    <React.Fragment key={suggestion.suggester_discord_user.discord_id}>
      <List.Item>
        <List.Content>
          {suggestion.discord_user.twitter_name && (
            <Image
              avatar
              size="mini"
              src={`https://avatars.io/twitter/${suggestion.discord_user.twitter_name}`}
            />
          )}
          <List.Header as="a" href={`/u/${suggestion.discord_user.discord_id}`}>
            {suggestion.discord_user.username}#
            {suggestion.discord_user.discriminator}
          </List.Header>
          <List.Description>
            <div style={{ marginTop: "0.5em" }}>
              <b>
                {suggestion.plus_region} | Suggested to join{" "}
                {suggestion.plus_server === "ONE" ? "+1 " : "+2 "} by{" "}
                <a href={`/u/${suggestion.suggester_discord_user.discord_id}`}>
                  {suggestion.suggester_discord_user.username}#
                  {suggestion.suggester_discord_user.discriminator}
                </a>
              </b>
            </div>
          </List.Description>
          <List.Description style={{ whiteSpace: "pre-wrap" }}>
            {suggestion.description}
          </List.Description>
        </List.Content>
      </List.Item>
      <Divider />
    </React.Fragment>
  ))

  return (
    <>
      {suggestionLists.length > 0 && (
        <>
          <h2>Suggested</h2>
          {suggestionLists}
        </>
      )}
    </>
  )
}

const Suggestions = ({
  user,
  showSuggestionForm,
  setShowSuggestionForm,
  plusServer,
  handleSuccess,
  handleError,
}) => {
  const { data, error, loading } = useQuery(suggestions)
  const {
    data: vouchesData,
    error: vouchesError,
    loading: vouchesLoading,
  } = useQuery(vouches)

  if (loading || vouchesLoading) return <Loading minHeight="250px" />
  if (error) return <Error errorMessage={error.message} />
  if (vouchesError) return <Error errorMessage={vouchesError.message} />
  if (!data.suggestions) return null

  const ownSuggestion = data.suggestions.find(
    suggestion =>
      suggestion.suggester_discord_user.discord_id === user.discord_id
  )

  const canSuggest = !ownSuggestion

  const canVouch = Boolean(
    user.plus.can_vouch && !user.plus.can_vouch_again_after
  )

  const getButtonText = () => {
    if (canSuggest && canVouch) return "Suggest or vouch a player"
    else if (canSuggest) return "Suggest a player"
    else if (canVouch) return "Vouch a player"
  }

  return (
    <>
      {!showSuggestionForm && (canSuggest || canVouch) && (
        <div style={{ marginTop: "2em" }}>
          <Button onClick={() => setShowSuggestionForm(true)}>
            {getButtonText()}
          </Button>
        </div>
      )}
      {showSuggestionForm && (
        <SuggestionForm
          plusServer={plusServer}
          hideForm={() => setShowSuggestionForm(false)}
          handleSuccess={handleSuccess}
          handleError={handleError}
          canSuggest={canSuggest}
          canVouch={canVouch}
          canVouchFor={user.plus.can_vouch}
        />
      )}
      {vouchesData.vouches.length > 0 && (
        <>
          <h2>Vouched</h2>
          <List>
            {vouchesData.vouches.map(vouch => {
              return (
                <List.Item
                  key={vouch.username}
                  style={{
                    marginTop: "0.5em",
                  }}
                >
                  <UserAvatar twitterName={vouch.twitter_name} paddingIfNull />
                  <List.Content>
                    <List.Header as="a" href={`/u/${vouch.discord_id}`}>
                      {vouch.username}#{vouch.discriminator}{" "}
                    </List.Header>
                    <List.Description>
                      Vouched to{" "}
                      {vouch.plus.vouch_status === "ONE" ? "+1" : "+2"} by{" "}
                      {vouch.plus.voucher_user.username}#
                      {vouch.plus.voucher_user.discriminator}
                    </List.Description>
                  </List.Content>
                </List.Item>
              )
            })}
          </List>
        </>
      )}
      <SuggestionList suggestionsArray={data.suggestions} />
    </>
  )
}

export default Suggestions
