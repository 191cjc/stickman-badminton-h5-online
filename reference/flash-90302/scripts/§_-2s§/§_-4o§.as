package §_-2s§
{
   import Playtomic.Link;
   import Playtomic.Log;
   import bobby.§_-07§;
   import bobby.§_-0v§;
   import bobby.§_-3h§;
   import flash.display.SimpleButton;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol504")]
   public class §_-4o§ extends §_-07§
   {
      
      public var moreBtn:SimpleButton;
      
      public var kongBtn:SimpleButton;
      
      public var §_-3V§:SimpleButton;
      
      public var §_-3T§:SimpleButton;
      
      public var §_-N§:SimpleButton;
      
      public function §_-4o§(param1:Boolean = true)
      {
         addFrameScript(61,this.§_-25§);
         super();
         if(param1)
         {
            §_-3h§.§_-0T§(0);
            §_-3h§.§_-B§("titlemusic.mp3",1,1);
         }
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         super.handleStageAdd(param1);
         §_-0v§.§_-31§ = false;
         SimpleButton(this.§_-3T§).addEventListener(MouseEvent.MOUSE_UP,this.§_-2t§);
         SimpleButton(this.§_-N§).addEventListener(MouseEvent.MOUSE_UP,this.§_-3§);
         SimpleButton(this.§_-3V§).addEventListener(MouseEvent.MOUSE_UP,this.§_-c§);
         SimpleButton(this.kongBtn).addEventListener(MouseEvent.MOUSE_UP,this.kongClick);
         SimpleButton(this.moreBtn).addEventListener(MouseEvent.MOUSE_UP,this.moreClick);
      }
      
      private function kongClick(param1:MouseEvent) : void
      {
         Link.Open(§_-0v§.§_-2r§,"TitleLogo","SponsorLinks");
         Log.CustomMetric("ClickedSponsorLink","Misc",true);
      }
      
      private function moreClick(param1:MouseEvent) : void
      {
         Link.Open(§_-0v§.§_-2r§,"TitleMoreGames","SponsorLinks");
         Log.CustomMetric("ClickedSponsorLink","Misc",true);
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         super.handleEnterFrame(param1);
      }
      
      override public function handleRemove(param1:Event) : void
      {
         super.handleRemove(param1);
         SimpleButton(this.§_-3T§).removeEventListener(MouseEvent.MOUSE_UP,this.§_-2t§);
         SimpleButton(this.§_-N§).removeEventListener(MouseEvent.MOUSE_UP,this.§_-3§);
         SimpleButton(this.§_-3V§).removeEventListener(MouseEvent.MOUSE_UP,this.§_-c§);
         SimpleButton(this.kongBtn).removeEventListener(MouseEvent.MOUSE_UP,this.kongClick);
         SimpleButton(this.moreBtn).removeEventListener(MouseEvent.MOUSE_UP,this.moreClick);
      }
      
      private function §_-2t§(param1:MouseEvent) : void
      {
         §_-0v§.§_-5q§(new §break§());
         Log.CustomMetric("ViewedCredits","Misc",true);
      }
      
      private function §_-3§(param1:MouseEvent) : void
      {
         §_-0v§.§_-5q§(new §_-0E§());
         Log.Play();
      }
      
      private function §_-c§(param1:MouseEvent) : void
      {
         §_-0v§.§_-5q§(new §var §());
         Log.CustomMetric("ViewedMultiplayer","Misc",false);
         Log.CustomMetric("ViewedMultiplayerUnique","Misc",true);
      }
      
      internal function §_-25§() : *
      {
         stop();
      }
   }
}

